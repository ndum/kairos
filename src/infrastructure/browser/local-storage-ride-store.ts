import * as v from 'valibot'

import type { RideStore } from '@/application/ports/ride-store'
import type { Ride } from '@/application/ride'

import { JourneySchema } from './journey-schema'
import { type StorageEnvironment, browserStorage } from './storage-environment'

const KEY = 'kairos:ride'
const VERSION = 1

const StoredRideSchema = v.object({
  version: v.literal(VERSION),
  ride: v.object({
    routeId: v.string(),
    direction: v.picklist(['outbound', 'return']),
    key: v.string(),
    departureAt: v.number(),
    leaveAt: v.number(),
    journey: JourneySchema,
  }),
})

export class LocalStorageRideStore implements RideStore {
  readonly #storage: StorageEnvironment['storage'] | null

  constructor(env: StorageEnvironment | null = browserStorage()) {
    this.#storage = env?.storage ?? null
  }

  load(): Ride | null {
    try {
      const raw = this.#storage?.getItem(KEY)
      if (!raw) return null
      const result = v.safeParse(StoredRideSchema, JSON.parse(raw))
      return result.success ? result.output.ride : null
    } catch {
      return null
    }
  }

  save(ride: Ride | null): void {
    try {
      if (ride) this.#storage?.setItem(KEY, JSON.stringify({ version: VERSION, ride }))
      else this.#storage?.removeItem(KEY)
    } catch {
      // The ride is a convenience. The app works on without it.
    }
  }
}
