import * as v from 'valibot'

import type { CachedJourneys, JourneyCache } from '@/application/ports/journey-cache'
import type { Cancel } from '@/application/ports/scheduler'

import { CACHE_VERSION, StoredJourneysSchema } from './journey-schema'
import { type StorageEnvironment, browserStorage, watchStorage } from './storage-environment'

const PREFIX = 'kairos:journeys:'

function decode(raw: string | null): CachedJourneys | null {
  if (raw === null) return null
  try {
    const result = v.safeParse(StoredJourneysSchema, JSON.parse(raw))
    if (!result.success) return null
    const { journeys, fetchedAt } = result.output
    return { journeys, fetchedAt }
  } catch {
    return null
  }
}

export class LocalStorageJourneyCache implements JourneyCache {
  readonly #env: StorageEnvironment | null

  constructor(env: StorageEnvironment | null = browserStorage()) {
    this.#env = env
  }

  read(key: string): CachedJourneys | null {
    try {
      return decode(this.#env?.storage.getItem(PREFIX + key) ?? null)
    } catch {
      return null
    }
  }

  write(key: string, entry: CachedJourneys): void {
    try {
      this.#env?.storage.setItem(PREFIX + key, JSON.stringify({ version: CACHE_VERSION, ...entry }))
    } catch {
      // Storage is full or blocked. The app keeps working without a cache.
    }
  }

  subscribe(listener: (key: string, entry: CachedJourneys) => void): Cancel {
    return watchStorage(
      this.#env,
      (key) => key.startsWith(PREFIX),
      (key, value) => {
        const entry = decode(value)
        if (entry) listener(key.slice(PREFIX.length), entry)
      },
    )
  }
}
