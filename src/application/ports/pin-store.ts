import type { PinnedTrip } from '../pinned-trip'

/** Keeps the pinned trip on the device. Losing it is no harm, so storage errors are ignored. */
export interface PinStore {
  load(): PinnedTrip | null
  save(pinned: PinnedTrip | null): void
}
