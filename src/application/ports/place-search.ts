import type { Coordinates } from '@/domain/geo'

/** A place found by what the user typed: a street address, a company or a building. */
export interface FoundPlace {
  readonly name: string
  readonly kind: 'address' | 'poi'
  readonly coordinates: Coordinates
}

/** Finds places by name or address. Only the text the user typed leaves the device. */
export interface PlaceSearchPort {
  searchPlaces(text: string, signal?: AbortSignal): Promise<FoundPlace[]>
}
