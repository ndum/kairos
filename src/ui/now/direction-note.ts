import type { DeviceLocation } from './use-device-location'
import type { DirectionBasis } from './use-route-choice'

/**
 * Why the board shows its direction:
 * - schedule: the times of the route for today decided
 * - location: the device is at one of the two places
 * - time: the position is known, but the time of day decided
 * - locating, denied, unavailable: the position is not known, so the time of day decides
 */
export type DirectionNote = 'schedule' | 'location' | 'time' | 'locating' | 'denied' | 'unavailable'

/**
 * No note when the user chose the direction. Without the location, only the schedule is worth
 * a note, because the time of day is what the user expects anyway.
 */
export function directionNoteOf(
  basis: DirectionBasis,
  location: DeviceLocation,
): DirectionNote | null {
  if (basis === 'swapped') return null
  if (basis === 'schedule') return 'schedule'
  if (location.kind === 'off') return null
  if (basis === 'location') return 'location'
  return location.kind === 'found' ? 'time' : location.kind
}
