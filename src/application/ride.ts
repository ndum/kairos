import { type Direction, type Route } from '@/domain/route'
import { type Instant, minutes } from '@/domain/time'
import type { Trip } from '@/domain/trip'

import { type PinnedTrip, journeyKey, pinTrip } from './pinned-trip'

/**
 * The trip the user is most likely on: the main trip of the board shortly before they had to
 * leave. It is kept on the device, so it is still there when the user opens the app on the way.
 */
export interface Ride extends PinnedTrip {
  /** When the user had to leave for it, from which on it counts as under way. */
  readonly leaveAt: Instant
}

/** A main trip counts once the user sees it this close to leaving. */
export const RIDE_AHEAD = minutes(10)

export const rideOf = (route: Route, direction: Direction, trip: Trip): Ride => ({
  ...pinTrip(route, direction, trip),
  leaveAt: trip.leaveAt,
})

/**
 * Whether the main trip of the board replaces the remembered ride. Once the user had to leave
 * for a ride, a later trip no longer replaces it, since the user is probably on the way.
 */
export function replacesRide(current: Ride | null, trip: Trip, now: Instant): boolean {
  if (trip.leaveAt - now > RIDE_AHEAD) return false
  if (current === null) return true
  if (current.key === journeyKey(trip.journey)) return current.leaveAt !== trip.leaveAt
  return now < current.leaveAt
}
