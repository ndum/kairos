import { type Coordinates, distanceInMeters } from './geo'
import { type Direction, type Route, positionOf } from './route'
import { type ScheduleDay, directionBySchedule } from './schedule'

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
  /** Today's times from the schedule of the route, if it has any. */
  readonly schedule?: ScheduleDay | null
}

export interface DirectionChoice {
  readonly direction: Direction
  /** Whether the position of the device, the schedule or the time of day decided. */
  readonly basis: 'location' | 'schedule' | 'time'
}

/**
 * Shows the direction that starts at the place the user is at. Otherwise the schedule of the
 * day decides, and without one the time of day.
 */
export function chooseDirection(route: Route, hints: DirectionHints): DirectionChoice {
  const byLocation = hints.location ? directionByLocation(route, hints.location) : null
  if (byLocation) return { direction: byLocation, basis: 'location' }
  const bySchedule = directionBySchedule(hints.schedule ?? null, hints.minuteOfDay)
  if (bySchedule) return { direction: bySchedule, basis: 'schedule' }
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
