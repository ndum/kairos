import { WALK_MAX } from './route-rules'
import { type Duration, MINUTE } from './time'

/** About 4.8 km/h, a calm pace with a bag. */
const METERS_PER_MINUTE = 80

/** Streets rarely lead straight to a stop, so the way is about a third longer. */
const DETOUR_FACTOR = 1.3

/** Estimates the walk over a distance as the crow flies, in whole minutes of at least one. */
export function estimateWalk(meters: number): Duration {
  const minutes = Math.ceil((Math.max(0, meters) * DETOUR_FACTOR) / METERS_PER_MINUTE)
  return Math.min(WALK_MAX, Math.max(1, minutes) * MINUTE)
}
