import type { Coordinates } from '@/domain/geo'

export type LocationResult =
  | { readonly kind: 'found'; readonly coordinates: Coordinates }
  /** The user or the browser does not allow access to the position. */
  | { readonly kind: 'denied' }
  /** The position is unknown or took too long to find. */
  | { readonly kind: 'unavailable' }

/** The position of the device. Kairos only uses it on the device and never sends it anywhere. */
export interface LocationPort {
  current(): Promise<LocationResult>
}
