import type { DeviceLocation } from './use-device-location'
import type { DirectionBasis } from './use-route-choice'

/**
 * Why the board shows its direction, for users who let the location choose it:
 * - location: the device is at one of the two places
 * - time: the position is known, but the time of day decided
 * - locating, denied, unavailable: the position is not known, so the time of day decides
 */
export type DirectionNote = 'location' | 'time' | 'locating' | 'denied' | 'unavailable'

/** No note when the user chose the direction or keeps the location switched off. */
export function directionNoteOf(
  basis: DirectionBasis,
  location: DeviceLocation,
): DirectionNote | null {
  if (basis === 'swapped' || location.kind === 'off') return null
  if (basis === 'location') return 'location'
  return location.kind === 'found' ? 'time' : location.kind
}
