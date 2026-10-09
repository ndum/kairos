import * as v from 'valibot'

import type { RouteRepository } from '@/application/ports/route-repository'
import type { Cancel } from '@/application/ports/scheduler'
import type { Route } from '@/domain/route'

import { ROUTES_VERSION, StoredRoutesSchema } from './route-schema'
import { type StorageEnvironment, browserStorage, watchStorage } from './storage-environment'

const KEY = 'kairos:routes'

function decode(raw: string | null): Route[] {
  if (raw === null) return []
  try {
    const result = v.safeParse(StoredRoutesSchema, JSON.parse(raw))
    return result.success ? result.output.routes : []
  } catch {
    return []
  }
}

export class LocalStorageRouteRepository implements RouteRepository {
  readonly #env: StorageEnvironment | null

  constructor(env: StorageEnvironment | null = browserStorage()) {
    this.#env = env
  }

  load(): Route[] {
    try {
      return decode(this.#env?.storage.getItem(KEY) ?? null)
    } catch {
      return []
    }
  }

  save(routes: readonly Route[]): void {
    if (!this.#env) throw new Error('The browser does not allow storing data for this site.')
    this.#env.storage.setItem(KEY, JSON.stringify({ version: ROUTES_VERSION, routes }))
  }

  subscribe(listener: (routes: Route[]) => void): Cancel {
    return watchStorage(
      this.#env,
      (key) => key === KEY,
      (_key, value) => {
        listener(decode(value))
      },
    )
  }
}
