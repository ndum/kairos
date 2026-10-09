import type { Clock } from '@/application/ports/clock'
import type { CachedJourneys, JourneyCache } from '@/application/ports/journey-cache'
import type { Cancel, Scheduler } from '@/application/ports/scheduler'
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

/** Lets pending promise callbacks run. */
export const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
