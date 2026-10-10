import { type Coordinates, distanceInMeters } from './geo'
import { type Direction, type Route, positionOf } from './route'

/** Beyond this distance from both places, the time of day decides the direction. */
export const LOCATION_RADIUS_METERS = 3000

/** Local time from which the return direction is shown by default: 12:00. */
export const DEFAULT_RETURN_FROM = 12 * 60

export interface DirectionHints {
  /** Current position of the user, if known and allowed. */
  readonly location?: Coordinates
  /** Local time in minutes since midnight. */
  readonly minuteOfDay: number
  /** Local time from which the return direction is shown, in minutes since midnight. */
  readonly returnFrom?: number
}

export interface DirectionChoice {
  readonly direction: Direction
  /** Whether the position of the device or the time of day decided. */
  readonly basis: 'location' | 'time'
}

/** Shows the direction that starts at the place the user is at, or guesses it from the time. */
export function chooseDirection(route: Route, hints: DirectionHints): DirectionChoice {
  const byLocation = hints.location ? directionByLocation(route, hints.location) : null
  if (byLocation) return { direction: byLocation, basis: 'location' }
  const returnFrom = hints.returnFrom ?? DEFAULT_RETURN_FROM
  return { direction: hints.minuteOfDay < returnFrom ? 'outbound' : 'return', basis: 'time' }
}

function directionByLocation(route: Route, location: Coordinates): Direction | null {
  const [first, second] = route.places.map(positionOf)
  if (!first || !second) return null

  const toFirst = distanceInMeters(location, first)
  const toSecond = distanceInMeters(location, second)
  if (Math.min(toFirst, toSecond) > LOCATION_RADIUS_METERS) return null
  return toFirst <= toSecond ? 'outbound' : 'return'
}
