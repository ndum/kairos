import type { Clock } from '@/application/ports/clock'
import type { CachedJourneys, JourneyCache } from '@/application/ports/journey-cache'
import type { PinnedTrip } from '@/application/pinned-trip'
import type { PinStore } from '@/application/ports/pin-store'
import type { RouteRepository } from '@/application/ports/route-repository'
import type { Cancel, Scheduler } from '@/application/ports/scheduler'
import type { Route } from '@/domain/route'
import type { Duration, Instant } from '@/domain/time'

export class FakeClock implements Clock {
  time: Instant

  constructor(time: Instant) {
    this.time = time
  }

  now(): Instant {
    return this.time
  }
}

interface ScheduledTask {
  readonly due: Instant
  readonly task: () => void
  done: boolean
}

/** Runs scheduled tasks only when the test moves the clock forward. */
export class FakeScheduler implements Scheduler {
  readonly #clock: FakeClock
  readonly #tasks: ScheduledTask[] = []

  constructor(clock: FakeClock) {
    this.#clock = clock
  }

  after(delay: Duration, task: () => void): Cancel {
    const entry: ScheduledTask = { due: this.#clock.time + delay, task, done: false }
    this.#tasks.push(entry)
    return () => {
      entry.done = true
    }
  }

  /** Due times of the tasks that have neither run nor been cancelled. */
  get pending(): Instant[] {
    return this.#tasks.filter((entry) => !entry.done).map((entry) => entry.due)
  }

  advance(duration: Duration): void {
    this.#clock.time += duration
    for (const entry of [...this.#tasks]) {
      if (entry.done || entry.due > this.#clock.time) continue
      entry.done = true
      entry.task()
    }
  }
}

export class MemoryJourneyCache implements JourneyCache {
  readonly #entries = new Map<string, CachedJourneys>()
  readonly #listeners = new Set<(key: string, entry: CachedJourneys) => void>()

  read(key: string): CachedJourneys | null {
    return this.#entries.get(key) ?? null
  }

  write(key: string, entry: CachedJourneys): void {
    this.#entries.set(key, entry)
  }

  subscribe(listener: (key: string, entry: CachedJourneys) => void): Cancel {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  /** Simulates an entry written by another tab. */
  writeFromElsewhere(key: string, entry: CachedJourneys): void {
    this.#entries.set(key, entry)
    for (const listener of this.#listeners) listener(key, entry)
  }
}

export class MemoryRouteRepository implements RouteRepository {
  routes: Route[]
  /** Makes every save fail, as when storage is full or blocked. */
  failing = false
  readonly #listeners = new Set<(routes: Route[]) => void>()

  constructor(routes: Route[] = []) {
    this.routes = routes
  }

  get listeners(): number {
    return this.#listeners.size
  }

  load(): Route[] {
    return [...this.routes]
  }

  save(routes: readonly Route[]): void {
    if (this.failing) throw new Error('The storage is full.')
    this.routes = [...routes]
  }

  subscribe(listener: (routes: Route[]) => void): Cancel {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  /** Simulates routes saved by another tab. */
  saveFromElsewhere(routes: Route[]): void {
    this.routes = routes
    for (const listener of this.#listeners) listener([...routes])
  }
}

export class MemoryPinStore implements PinStore {
  pinned: PinnedTrip | null

  constructor(pinned: PinnedTrip | null = null) {
    this.pinned = pinned
  }

  load(): PinnedTrip | null {
    return this.pinned
  }

  save(pinned: PinnedTrip | null): void {
    this.pinned = pinned
  }
}

/** The part of the Web Storage API that the adapters use. */
export class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  readonly items = new Map<string, string>()

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value)
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }
}

/** A "storage" event as another tab triggers it. */
export const storageEvent = (key: string, newValue: string | null): Event =>
  Object.assign(new Event('storage'), { key, newValue })

/** Lets pending promise callbacks run. */
export const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
