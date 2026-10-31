import type { Ride } from '../ride'

/** Keeps the current ride on the device. Losing it is no harm, so storage errors are ignored. */
export interface RideStore {
  load(): Ride | null
  save(ride: Ride | null): void
}
