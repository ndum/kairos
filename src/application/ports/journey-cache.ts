import type { Journey } from '@/domain/journey'
import type { Instant } from '@/domain/time'

import type { Cancel } from './scheduler'

export interface CachedJourneys {
  readonly journeys: readonly Journey[]
  readonly fetchedAt: Instant
}

/**
 * Keeps the last journeys per connection, so the app starts with data and several open
 * windows or tabs share one refresh.
 */
export interface JourneyCache {
  read(key: string): CachedJourneys | null
  write(key: string, entry: CachedJourneys): void
  /** Reports entries written elsewhere, for example by another tab. */
  subscribe(listener: (key: string, entry: CachedJourneys) => void): Cancel
}
