import type { Coordinates } from './geo'
import type { Line } from './journey'
import type { Duration } from './time'

export interface StopRef {
  readonly id: string
  readonly name: string
  readonly coordinates?: Coordinates
}

/** One end of a route, for example home or work, with the stop used there. */
export interface Place {
  readonly name: string
  readonly stop: StopRef
  /** Walking time between the place and its stop, the same in both directions. */
  readonly walk: Duration
  /** Position of the place itself, if known. Falls back to the stop. */
  readonly coordinates?: Coordinates
}

/** A line the user likes to take. Lines are matched by name, the mode sets their colour. */
export type PreferredLine = Pick<Line, 'name' | 'mode'>

export interface Route {
  readonly id: string
  readonly name: string
  readonly places: readonly [Place, Place]
  /** Extra time the user keeps on top of the walk when leaving either place. */
  readonly buffer: Duration
  /** Lines such as the S1 or bus 20. An empty list accepts every line. */
  readonly preferredLines: readonly PreferredLine[]
}

/** Outbound travels from the first place to the second, return the other way round. */
export type Direction = 'outbound' | 'return'

export interface Endpoints {
  readonly origin: Place
  readonly destination: Place
  /** Extra time kept when leaving the origin. */
  readonly buffer: Duration
}

export function endpoints(route: Route, direction: Direction): Endpoints {
  const [first, second] = route.places
  const [origin, destination] = direction === 'outbound' ? [first, second] : [second, first]
  return { origin, destination, buffer: route.buffer }
}

export const oppositeDirection = (direction: Direction): Direction =>
  direction === 'outbound' ? 'return' : 'outbound'

export const positionOf = (place: Place): Coordinates | undefined =>
  place.coordinates ?? place.stop.coordinates
