import type { Coordinates } from './geo'
import type { Line } from './journey'
import type { Duration } from './time'

export interface StopRef {
  readonly id: string
  readonly name: string
  readonly coordinates?: Coordinates
}

/** A stop of a place with the walking time between them, the same in both directions. */
export interface PlaceStop {
  readonly stop: StopRef
  readonly walk: Duration
}

/** One end of a route, for example home or work, with the stop used there. */
export interface Place {
  readonly name: string
  readonly stop: StopRef
  /** Walking time between the place and its stop, the same in both directions. */
  readonly walk: Duration
  /** Another stop nearby, for example a bus stop next to the station. Kairos takes the faster. */
  readonly secondStop?: PlaceStop
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

/** The stops of a place with their walks, the main stop first. */
export const stopsOf = (place: Place): PlaceStop[] => [
  { stop: place.stop, walk: place.walk },
  ...(place.secondStop ? [place.secondStop] : []),
]

/** The walk between a place and one of its stops. Any other stop counts as the main one. */
export const walkTo = (place: Place, stopId: string | undefined): Duration =>
  place.secondStop && place.secondStop.stop.id === stopId ? place.secondStop.walk : place.walk

/** Two stops a connection runs between. */
export interface StopPair {
  readonly from: StopRef
  readonly to: StopRef
}

/** Every pair of a stop at the origin and a stop at the destination, the main stops first. */
export const stopPairs = ({
  origin,
  destination,
}: Pick<Endpoints, 'origin' | 'destination'>): StopPair[] =>
  stopsOf(origin).flatMap(({ stop: from }) =>
    stopsOf(destination).map(({ stop: to }) => ({ from, to })),
  )
