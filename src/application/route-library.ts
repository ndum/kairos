import type { Place, Route } from '@/domain/route'
import { isValidRoute, normalizeLines } from '@/domain/route-rules'

import type { RouteRepository } from './ports/route-repository'
import type { Cancel } from './ports/scheduler'

export type RouteDraft = Omit<Route, 'id'>

export interface LibrarySnapshot {
  readonly routes: readonly Route[]
  /** False when the last change could not be stored on the device. */
  readonly saved: boolean
}

/** A removed route with its former position, so the removal can be undone. */
export interface RemovedRoute {
  readonly route: Route
  readonly index: number
}

export class InvalidRouteError extends Error {
  override readonly name = 'InvalidRouteError'
}

export interface RouteLibraryDependencies {
  readonly repository: RouteRepository
  readonly createId: () => string
}

const tidyPlace = (place: Place): Place => ({ ...place, name: place.name.trim() })

function tidy(route: Route): Route {
  const tidied: Route = {
    ...route,
    name: route.name.trim(),
    places: [tidyPlace(route.places[0]), tidyPlace(route.places[1])],
    preferredLines: normalizeLines(route.preferredLines),
  }
  if (!isValidRoute(tidied)) throw new InvalidRouteError(`The route "${route.name}" is invalid.`)
  return tidied
}

/**
 * The user's routes in their chosen order. Changes are saved on the device right away and
 * changes from other tabs are taken over.
 */
export class RouteLibrary {
  readonly #deps: RouteLibraryDependencies
  readonly #listeners = new Set<(snapshot: LibrarySnapshot) => void>()
  readonly #unsubscribe: Cancel
  #snapshot: LibrarySnapshot

  constructor(deps: RouteLibraryDependencies) {
    this.#deps = deps
    this.#snapshot = { routes: deps.repository.load().filter(isValidRoute), saved: true }
    this.#unsubscribe = deps.repository.subscribe((routes) => {
      this.#publish({ routes: routes.filter(isValidRoute), saved: true })
    })
  }

  get snapshot(): LibrarySnapshot {
    return this.#snapshot
  }

  subscribe(listener: (snapshot: LibrarySnapshot) => void): Cancel {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  find(id: string): Route | undefined {
    return this.#routes.find((route) => route.id === id)
  }

  add(draft: RouteDraft): Route {
    const route = tidy({ ...draft, id: this.#uniqueId() })
    this.#commit([...this.#routes, route])
    return route
  }

  /** Replaces the route with the same id, or adds it again if it was removed meanwhile. */
  update(route: Route): void {
    const updated = tidy(route)
    const index = this.#indexOf(route.id)
    this.#commit(index === -1 ? [...this.#routes, updated] : this.#routes.with(index, updated))
  }

  remove(id: string): RemovedRoute | null {
    const index = this.#indexOf(id)
    const route = this.#routes[index]
    if (!route) return null
    this.#commit(this.#routes.toSpliced(index, 1))
    return { route, index }
  }

  restore({ route, index }: RemovedRoute): void {
    if (this.find(route.id)) return
    this.#commit(this.#routes.toSpliced(index, 0, route))
  }

  /** Moves a route by the given number of positions, at most to either end of the list. */
  move(id: string, offset: number): void {
    const from = this.#indexOf(id)
    const route = this.#routes[from]
    if (!route) return
    const to = Math.min(Math.max(from + offset, 0), this.#routes.length - 1)
    if (to === from) return
    this.#commit(this.#routes.toSpliced(from, 1).toSpliced(to, 0, route))
  }

  dispose(): void {
    this.#unsubscribe()
    this.#listeners.clear()
  }

  get #routes(): readonly Route[] {
    return this.#snapshot.routes
  }

  #indexOf(id: string): number {
    return this.#routes.findIndex((route) => route.id === id)
  }

  #uniqueId(): string {
    let id = this.#deps.createId()
    while (this.find(id)) id = this.#deps.createId()
    return id
  }

  #commit(routes: readonly Route[]): void {
    let saved = true
    try {
      this.#deps.repository.save(routes)
    } catch {
      // The routes stay available until the app is closed. The UI tells the user.
      saved = false
    }
    this.#publish({ routes, saved })
  }

  #publish(snapshot: LibrarySnapshot): void {
    this.#snapshot = snapshot
    for (const listener of this.#listeners) listener(snapshot)
  }
}
