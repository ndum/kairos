import * as v from 'valibot'

import type { PinnedTrip } from '@/application/pinned-trip'
import type { PinStore } from '@/application/ports/pin-store'

import { JourneySchema } from './journey-schema'
import { type StorageEnvironment, browserStorage } from './storage-environment'

const KEY = 'kairos:pinned'
const VERSION = 1

const StoredPinSchema = v.object({
  version: v.literal(VERSION),
  pinned: v.object({
    routeId: v.string(),
    direction: v.picklist(['outbound', 'return']),
    key: v.string(),
    departureAt: v.number(),
    journey: JourneySchema,
  }),
})

export class LocalStoragePinStore implements PinStore {
  readonly #storage: StorageEnvironment['storage'] | null

  constructor(env: StorageEnvironment | null = browserStorage()) {
    this.#storage = env?.storage ?? null
  }

  load(): PinnedTrip | null {
    try {
      const raw = this.#storage?.getItem(KEY)
      if (!raw) return null
      const result = v.safeParse(StoredPinSchema, JSON.parse(raw))
      return result.success ? result.output.pinned : null
    } catch {
      return null
    }
  }

  save(pinned: PinnedTrip | null): void {
    try {
      if (pinned) this.#storage?.setItem(KEY, JSON.stringify({ version: VERSION, pinned }))
      else this.#storage?.removeItem(KEY)
    } catch {
      // A pinned trip is a convenience. The app works on without it.
    }
  }
}
