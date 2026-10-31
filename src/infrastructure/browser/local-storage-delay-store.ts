import * as v from 'valibot'

import type { DelayStore } from '@/application/ports/delay-store'
import type { DelayRecord } from '@/domain/punctuality'

import { type StorageEnvironment, browserStorage } from './storage-environment'

const KEY = 'kairos:delays'
const VERSION = 1

const StoredDelaysSchema = v.object({
  version: v.literal(VERSION),
  records: v.array(
    v.object({
      routeId: v.string(),
      line: v.string(),
      mode: v.picklist(['train', 'tram', 'bus', 'ship', 'cableway', 'other']),
      departureAt: v.number(),
      departureDelay: v.number(),
      arrivalDelay: v.number(),
    }),
  ),
})

export class LocalStorageDelayStore implements DelayStore {
  readonly #storage: StorageEnvironment['storage'] | null

  constructor(env: StorageEnvironment | null = browserStorage()) {
    this.#storage = env?.storage ?? null
  }

  load(): DelayRecord[] {
    try {
      const raw = this.#storage?.getItem(KEY)
      if (!raw) return []
      const result = v.safeParse(StoredDelaysSchema, JSON.parse(raw))
      return result.success ? result.output.records : []
    } catch {
      return []
    }
  }

  save(records: readonly DelayRecord[]): void {
    try {
      if (records.length > 0) {
        this.#storage?.setItem(KEY, JSON.stringify({ version: VERSION, records }))
      } else this.#storage?.removeItem(KEY)
    } catch {
      // The punctuality is a convenience. The app works on without it.
    }
  }
}
