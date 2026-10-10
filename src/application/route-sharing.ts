import { lineKey } from '@/domain/line-preference'
import type { Place, Route } from '@/domain/route'
import { isValidRoute } from '@/domain/route-rules'

/** Leaves out what stays on the device: the positions of places, which can be a home. */
export function forSharing(route: Route): Route {
  const strip = ({ coordinates, ...place }: Place): Place => place
  return { ...route, places: [strip(route.places[0]), strip(route.places[1])] }
}

export type ImportStatus = 'new' | 'changed' | 'unchanged' | 'invalid'

export interface ImportItem {
  readonly route: Route
  readonly status: ImportStatus
}

const samePlace = (a: Place, b: Place): boolean =>
  a.name === b.name &&
  a.stop.id === b.stop.id &&
  a.walk === b.walk &&
  a.secondStop?.stop.id === b.secondStop?.stop.id &&
  a.secondStop?.walk === b.secondStop?.walk

function sameRoute(a: Route, b: Route): boolean {
  const lines = (route: Route): string =>
    route.preferredLines.map((line) => `${lineKey(line.name)}:${line.mode}`).join(',')
  return (
    a.name === b.name &&
    a.buffer === b.buffer &&
    samePlace(a.places[0], b.places[0]) &&
    samePlace(a.places[1], b.places[1]) &&
    lines(a) === lines(b)
  )
}

/**
 * Compares shared routes with the ones on the device. Routes are matched by their id, and
 * routes that break the rules are marked, since a link can be altered.
 */
export function planImport(existing: readonly Route[], incoming: readonly Route[]): ImportItem[] {
  return incoming.map((route) => {
    if (!isValidRoute(route)) return { route, status: 'invalid' }
    const current = existing.find(({ id }) => id === route.id)
    if (!current) return { route, status: 'new' }
    return { route, status: sameRoute(current, route) ? 'unchanged' : 'changed' }
  })
}
