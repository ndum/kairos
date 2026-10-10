import type { Route } from '@/domain/route'

import type { Cancel } from './scheduler'

/** Keeps the user's routes on the device. */
export interface RouteRepository {
  load(): Route[]
  /** Throws when the routes cannot be stored, for example because storage is full. */
  save(routes: readonly Route[]): void
  /** Reports routes saved elsewhere, for example in another tab. */
  subscribe(listener: (routes: Route[]) => void): Cancel
}
