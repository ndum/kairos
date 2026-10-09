import type { StopRef } from '@/domain/route'

import type { TimetablePort } from './ports/timetable'

export const MIN_QUERY_LENGTH = 2

export interface StopSearchOptions {
  /** Number of searches kept in memory. */
  readonly cacheSize?: number
}

/** Finds stops by name. Typing back and forth repeats searches, so results are kept briefly. */
export class StopSearch {
  readonly #timetable: TimetablePort
  readonly #cacheSize: number
  readonly #cache = new Map<string, readonly StopRef[]>()

  constructor(timetable: TimetablePort, options: StopSearchOptions = {}) {
    this.#timetable = timetable
    this.#cacheSize = options.cacheSize ?? 30
  }

  async find(text: string, signal?: AbortSignal): Promise<readonly StopRef[]> {
    const query = text.trim().replace(/\s+/g, ' ')
    if (query.length < MIN_QUERY_LENGTH) return []

    const key = query.toLowerCase()
    const cached = this.#cache.get(key)
    if (cached) {
      this.#remember(key, cached)
      return cached
    }

    const stops = await this.#timetable.searchStops(query, signal)
    this.#remember(key, stops)
    return stops
  }

  /** Keeps the entry as the most recent one and drops the oldest beyond the cache size. */
  #remember(key: string, stops: readonly StopRef[]): void {
    this.#cache.delete(key)
    this.#cache.set(key, stops)
    for (const oldest of this.#cache.keys()) {
      if (this.#cache.size <= this.#cacheSize) break
      this.#cache.delete(oldest)
    }
  }
}
