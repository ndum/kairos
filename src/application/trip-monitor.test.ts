import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Journey } from '@/domain/journey'
import { HOUR, MINUTE, SECOND } from '@/domain/time'
import { at, morningCommute, stop } from '@/test/builders'
import { FakeClock, FakeScheduler, MemoryJourneyCache, settle } from '@/test/fakes'

import { TimetableError, type TimetablePort } from './ports/timetable'
import { JOURNEY_LIMIT, type MonitorTarget, TripMonitor, cacheKey } from './trip-monitor'

const from = stop('Riverside')
const to = stop('Market Square')
const key = cacheKey(from, to)

const firstBatch: Journey[] = [morningCommute('07:05')]
const secondBatch: Journey[] = [morningCommute('07:29')]

describe('TripMonitor', () => {
  let clock: FakeClock
  let scheduler: FakeScheduler
  let cache: MemoryJourneyCache
  let findJourneys: ReturnType<typeof vi.fn<TimetablePort['findJourneys']>>
  let monitor: TripMonitor
  let leaveIn = 10 * MINUTE

  const target: MonitorTarget = { from, to, nextLeaveAt: (_journeys, now) => now + leaveIn }

  beforeEach(() => {
    clock = new FakeClock(at('06:40'))
    scheduler = new FakeScheduler(clock)
    cache = new MemoryJourneyCache()
    findJourneys = vi.fn<TimetablePort['findJourneys']>().mockResolvedValue(firstBatch)
    leaveIn = 10 * MINUTE
    monitor = new TripMonitor({
      timetable: { findJourneys, searchStops: vi.fn(), stopsNear: vi.fn() },
      cache,
      clock,
      scheduler,
    })
  })

  it('loads the journeys of a connection and goes live', async () => {
    monitor.watch(target)
    expect(monitor.snapshot.status).toBe('loading')

    await settle()

    expect(findJourneys).toHaveBeenCalledWith(
      { from, to, at: at('06:40'), limit: JOURNEY_LIMIT },
      expect.any(AbortSignal),
    )
    expect(monitor.snapshot).toMatchObject({
      status: 'live',
      journeys: firstBatch,
      fetchedAt: at('06:40'),
      error: null,
    })
    expect(cache.read(key)).toEqual({ journeys: firstBatch, fetchedAt: at('06:40') })
  })

  it('asks for journeys from a later time and keeps them apart from the next ones', async () => {
    monitor.watch({ ...target, at: at('17:00') })
    await settle()

    expect(findJourneys).toHaveBeenCalledWith(
      { from, to, at: at('17:00'), limit: JOURNEY_LIMIT },
      expect.any(AbortSignal),
    )
    expect(cache.read(cacheKey(from, to, at('17:00')))?.journeys).toEqual(firstBatch)
    expect(cache.read(key)).toBeNull()
  })

  it('asks from now on once the later time has come', async () => {
    monitor.watch({ ...target, at: at('06:00') })
    await settle()

    expect(findJourneys).toHaveBeenCalledWith(
      expect.objectContaining({ at: at('06:40') }),
      expect.any(AbortSignal),
    )
  })

  it('shows cached journeys while it refreshes', async () => {
    cache.write(key, { journeys: secondBatch, fetchedAt: at('06:20') })

    monitor.watch(target)
    expect(monitor.snapshot).toMatchObject({ status: 'stale', journeys: secondBatch })

    await settle()
    expect(monitor.snapshot).toMatchObject({ status: 'live', journeys: firstBatch })
  })

  it('refreshes every 30 seconds when the user has to leave soon', async () => {
    monitor.watch(target)
    await settle()
    expect(monitor.snapshot.nextRefreshAt).toBe(at('06:40') + 30 * SECOND)

    scheduler.advance(30 * SECOND)
    await settle()

    expect(findJourneys).toHaveBeenCalledTimes(2)
  })

  it('refreshes every two minutes when leaving is further away', async () => {
    leaveIn = HOUR
    monitor.watch(target)
    await settle()

    expect(monitor.snapshot.nextRefreshAt).toBe(at('06:42'))
  })

  it('keeps the last journeys and backs off after failures', async () => {
    monitor.watch(target)
    await settle()
    findJourneys.mockRejectedValue(new TimetableError('timeout', 'Too slow'))

    scheduler.advance(30 * SECOND)
    await settle()
    expect(monitor.snapshot).toMatchObject({
      status: 'stale',
      journeys: firstBatch,
      error: { reason: 'timeout' },
      nextRefreshAt: clock.now() + 30 * SECOND,
    })

    scheduler.advance(30 * SECOND)
    await settle()
    expect(monitor.snapshot.nextRefreshAt).toBe(clock.now() + MINUTE)
  })

  it('reports an error when it has no journeys at all', async () => {
    findJourneys.mockRejectedValue(new TimetableError('network', 'Offline'))

    monitor.watch(target)
    await settle()

    expect(monitor.snapshot).toMatchObject({ status: 'error', error: { reason: 'network' } })
  })

  it('treats unexpected failures as network errors', async () => {
    findJourneys.mockRejectedValue(new TypeError('Failed to fetch'))

    monitor.watch(target)
    await settle()

    expect(monitor.snapshot.error).toBeInstanceOf(TimetableError)
    expect(monitor.snapshot.error?.reason).toBe('network')
  })

  it('skips the request when another tab refreshed a moment ago', async () => {
    cache.write(key, { journeys: secondBatch, fetchedAt: at('06:40') - 10 * SECOND })

    monitor.watch(target)
    await settle()

    expect(findJourneys).not.toHaveBeenCalled()
    expect(monitor.snapshot).toMatchObject({ status: 'live', journeys: secondBatch })
    expect(monitor.snapshot.nextRefreshAt).toBe(at('06:40') + 20 * SECOND)
  })

  it('takes over journeys that another tab fetched', async () => {
    monitor.watch(target)
    await settle()

    clock.time += 15 * SECOND
    cache.writeFromElsewhere(key, { journeys: secondBatch, fetchedAt: clock.now() })

    expect(monitor.snapshot).toMatchObject({ status: 'live', journeys: secondBatch })
    expect(scheduler.pending).toEqual([clock.now() + 30 * SECOND])
  })

  it('pauses in the background and catches up on resume', async () => {
    monitor.watch(target)
    await settle()

    monitor.pause()
    expect(scheduler.pending).toEqual([])
    expect(monitor.snapshot.nextRefreshAt).toBeNull()

    scheduler.advance(5 * MINUTE)
    expect(findJourneys).toHaveBeenCalledTimes(1)

    monitor.resume()
    await settle()
    expect(findJourneys).toHaveBeenCalledTimes(2)
  })

  it('aborts the request of the previous connection', async () => {
    let firstSignal: AbortSignal | undefined
    findJourneys.mockImplementationOnce((_query, signal) => {
      firstSignal = signal
      return new Promise(() => undefined)
    })

    monitor.watch(target)
    monitor.watch({ ...target, to: stop('Old Town') })
    await settle()

    expect(firstSignal?.aborted).toBe(true)
    expect(monitor.snapshot).toMatchObject({ status: 'live', journeys: firstBatch })
  })

  it('notifies subscribers and stops after dispose', async () => {
    const listener = vi.fn()
    monitor.subscribe(listener)
    monitor.watch(target)
    await settle()
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'live' }))

    monitor.dispose()
    listener.mockClear()
    cache.writeFromElsewhere(key, { journeys: secondBatch, fetchedAt: clock.now() + MINUTE })

    expect(listener).not.toHaveBeenCalled()
    expect(scheduler.pending).toEqual([])
  })
})
