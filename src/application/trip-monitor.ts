import type { Journey } from '@/domain/journey'
import type { StopRef } from '@/domain/route'
import type { Duration, Instant } from '@/domain/time'

import type { Clock } from './ports/clock'
import type { CachedJourneys, JourneyCache } from './ports/journey-cache'
import type { Cancel, Scheduler } from './ports/scheduler'
import { TimetableError, type TimetablePort } from './ports/timetable'
import { refreshInterval, retryDelay } from './refresh-policy'

/**
 * - loading: no journeys yet, the first request is running
 * - live: journeys from a successful refresh
 * - stale: journeys from the cache or from before a failed refresh
 * - error: no journeys and the last refresh failed
 */
export type MonitorStatus = 'loading' | 'live' | 'stale' | 'error'

export interface MonitorSnapshot {
  readonly status: MonitorStatus
  readonly journeys: readonly Journey[]
  readonly fetchedAt: Instant | null
  readonly error: TimetableError | null
  readonly nextRefreshAt: Instant | null
}

export interface MonitorTarget {
  readonly from: StopRef
  readonly to: StopRef
  /** Leave time of the next relevant trip, which decides how often to refresh. */
  readonly nextLeaveAt: (journeys: readonly Journey[], now: Instant) => Instant | null
  /** Asks for journeys from this time instead of now, for example for a trip planned later. */
  readonly at?: Instant
  /** Asks for the journeys that arrive by the time instead of those that leave after it. */
  readonly arriveBy?: boolean
}

export interface TripMonitorDependencies {
  readonly timetable: TimetablePort
  readonly cache: JourneyCache
  readonly clock: Clock
  readonly scheduler: Scheduler
}

/** Journeys per request. Variants of the same train are counted separately. */
export const JOURNEY_LIMIT = 8

const INITIAL: MonitorSnapshot = {
  status: 'loading',
  journeys: [],
  fetchedAt: null,
  error: null,
  nextRefreshAt: null,
}

export function cacheKey(from: StopRef, to: StopRef, at?: Instant, arriveBy = false): string {
  if (at === undefined) return `${from.id}>${to.id}`
  return `${from.id}>${to.id}${arriveBy ? '<' : '@'}${at}`
}

/**
 * Keeps the journeys of one connection up to date. Refreshes adapt to how soon the user has
 * to leave, pause while the app is hidden, back off after errors and are shared with other
 * tabs through the cache.
 */
export class TripMonitor {
  readonly #deps: TripMonitorDependencies
  readonly #listeners = new Set<(snapshot: MonitorSnapshot) => void>()
  readonly #unsubscribe: Cancel
  #snapshot = INITIAL
  #target: MonitorTarget | null = null
  #key = ''
  #failures = 0
  #paused = false
  #cancelTimer: Cancel | null = null
  #request: AbortController | null = null

  constructor(deps: TripMonitorDependencies) {
    this.#deps = deps
    this.#unsubscribe = deps.cache.subscribe((key, entry) => {
      if (key !== this.#key || entry.fetchedAt <= (this.#snapshot.fetchedAt ?? 0)) return
      this.#failures = 0
      this.#accept(entry)
      this.#schedule()
    })
  }

  get snapshot(): MonitorSnapshot {
    return this.#snapshot
  }

  subscribe(listener: (snapshot: MonitorSnapshot) => void): Cancel {
    this.#listeners.add(listener)
    listener(this.#snapshot)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  watch(target: MonitorTarget): void {
    this.#cancel()
    this.#target = target
    this.#key = cacheKey(target.from, target.to, target.at, target.arriveBy)
    this.#failures = 0

    const cached = this.#deps.cache.read(this.#key)
    this.#emit(
      cached
        ? { ...INITIAL, status: 'stale', journeys: cached.journeys, fetchedAt: cached.fetchedAt }
        : INITIAL,
    )
    void this.refresh()
  }

  /** Fetches new journeys unless another tab did so recently. Pass force to skip that check. */
  async refresh({ force = false } = {}): Promise<void> {
    const target = this.#target
    if (!target || this.#paused) return
    this.#cancel()

    const { cache, clock, timetable } = this.#deps
    const now = clock.now()
    const cached = cache.read(this.#key)
    if (!force && cached && now - cached.fetchedAt < this.#interval(cached.journeys, now)) {
      this.#accept(cached)
      this.#schedule()
      return
    }

    const request = new AbortController()
    this.#request = request
    try {
      const journeys = await timetable.findJourneys(
        {
          from: target.from,
          to: target.to,
          at: Math.max(now, target.at ?? now),
          ...(target.arriveBy && { arriveBy: true }),
          limit: JOURNEY_LIMIT,
        },
        request.signal,
      )
      if (request.signal.aborted) return
      const entry: CachedJourneys = { journeys, fetchedAt: clock.now() }
      cache.write(this.#key, entry)
      this.#failures = 0
      this.#accept(entry)
    } catch (error) {
      if (request.signal.aborted) return
      this.#failures += 1
      this.#emit({
        ...this.#snapshot,
        status: this.#snapshot.fetchedAt === null ? 'error' : 'stale',
        error:
          error instanceof TimetableError
            ? error
            : new TimetableError('network', 'The timetable could not be reached.', {
                cause: error,
              }),
      })
    } finally {
      if (this.#request === request) this.#request = null
    }
    this.#schedule()
  }

  /** Stops refreshing, for example while the app is in the background. */
  pause(): void {
    this.#paused = true
    this.#cancel()
    this.#emit({ ...this.#snapshot, nextRefreshAt: null })
  }

  /** Continues refreshing and catches up right away. */
  resume(): void {
    if (!this.#paused) return
    this.#paused = false
    void this.refresh()
  }

  dispose(): void {
    this.#cancel()
    this.#target = null
    this.#unsubscribe()
    this.#listeners.clear()
  }

  #interval(journeys: readonly Journey[], now: Instant): Duration {
    return refreshInterval(this.#target?.nextLeaveAt(journeys, now) ?? null, now)
  }

  #schedule(): void {
    this.#cancelTimer?.()
    this.#cancelTimer = null
    if (!this.#target || this.#paused) return

    const now = this.#deps.clock.now()
    const fetchedAt = this.#snapshot.fetchedAt ?? now
    const delay =
      this.#failures > 0
        ? retryDelay(this.#failures)
        : Math.max(0, fetchedAt + this.#interval(this.#snapshot.journeys, now) - now)

    this.#cancelTimer = this.#deps.scheduler.after(delay, () => {
      void this.refresh()
    })
    this.#emit({ ...this.#snapshot, nextRefreshAt: now + delay })
  }

  #cancel(): void {
    this.#cancelTimer?.()
    this.#cancelTimer = null
    this.#request?.abort()
    this.#request = null
  }

  #accept(entry: CachedJourneys): void {
    this.#emit({
      status: 'live',
      journeys: entry.journeys,
      fetchedAt: entry.fetchedAt,
      error: null,
      nextRefreshAt: this.#snapshot.nextRefreshAt,
    })
  }

  #emit(snapshot: MonitorSnapshot): void {
    this.#snapshot = snapshot
    for (const listener of this.#listeners) listener(snapshot)
  }
}
