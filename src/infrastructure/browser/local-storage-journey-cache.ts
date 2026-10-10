import * as v from 'valibot'

import type { CachedJourneys, JourneyCache } from '@/application/ports/journey-cache'
import type { Cancel } from '@/application/ports/scheduler'

import { CACHE_VERSION, StoredJourneysSchema } from './journey-schema'

const PREFIX = 'kairos:journeys:'

export interface StorageEnvironment {
  readonly storage: Pick<Storage, 'getItem' | 'setItem'>
  /** Source of the "storage" events that report writes from other tabs. */
  readonly events: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
}

/** Reading localStorage throws when the user blocks site data, so the cache stays optional. */
function browserEnvironment(): StorageEnvironment | null {
  try {
    return typeof window === 'undefined' ? null : { storage: window.localStorage, events: window }
  } catch {
    return null
  }
}

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

  constructor(env: StorageEnvironment | null = browserEnvironment()) {
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
    const env = this.#env
    if (!env) return () => undefined

    const onStorage = (event: Event): void => {
      const { key, newValue } = event as StorageEvent
      if (!key?.startsWith(PREFIX)) return
      const entry = decode(newValue)
      if (entry) listener(key.slice(PREFIX.length), entry)
    }
    env.events.addEventListener('storage', onStorage)
    return () => {
      env.events.removeEventListener('storage', onStorage)
    }
  }
}
