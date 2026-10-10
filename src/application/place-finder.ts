import { type Coordinates, distanceInMeters } from '@/domain/geo'
import type { StopRef } from '@/domain/route'
import type { Duration } from '@/domain/time'
import { estimateWalk } from '@/domain/walking'

import type { FoundPlace, PlaceSearchPort } from './ports/place-search'
import type { TimetablePort } from './ports/timetable'

export const MIN_PLACE_QUERY_LENGTH = 3

/** Places shown from each source, addresses and companies. */
const PLACES_PER_SOURCE = 5

/** Stops offered around a place. */
export const NEARBY_STOP_COUNT = 5

export interface NearbyStop {
  readonly stop: StopRef
  /** Distance from the place as the crow flies, in meters. */
  readonly distance: number
  readonly walk: Duration
}

export interface PlaceFinderDeps {
  readonly addresses: PlaceSearchPort
  readonly companies: PlaceSearchPort
  readonly timetable: Pick<TimetablePort, 'stopsNear'>
}

/** About a hundred meters, enough to find the stops around a place without revealing it. */
const roundPosition = ({ latitude, longitude }: Coordinates): Coordinates => ({
  latitude: Math.round(latitude * 1000) / 1000,
  longitude: Math.round(longitude * 1000) / 1000,
})

function distinctByName(places: readonly FoundPlace[]): FoundPlace[] {
  const seen = new Set<string>()
  return places.filter(({ name }) => {
    const key = name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Finds a place by address, company or building, and the stops around it. */
export class PlaceFinder {
  readonly #addresses: PlaceSearchPort
  readonly #companies: PlaceSearchPort
  readonly #timetable: Pick<TimetablePort, 'stopsNear'>

  constructor(deps: PlaceFinderDeps) {
    this.#addresses = deps.addresses
    this.#companies = deps.companies
    this.#timetable = deps.timetable
  }

  /**
   * Asks both sources at once. A house number in the text puts addresses first, otherwise
   * companies and buildings come first. Fails only when both sources fail.
   */
  async find(text: string, signal?: AbortSignal): Promise<FoundPlace[]> {
    const query = text.trim().replace(/\s+/g, ' ')
    if (query.length < MIN_PLACE_QUERY_LENGTH) return []

    const [addresses, companies] = await Promise.allSettled([
      this.#addresses.searchPlaces(query, signal),
      this.#companies.searchPlaces(query, signal),
    ])
    signal?.throwIfAborted()
    if (addresses.status === 'rejected' && companies.status === 'rejected') {
      throw new Error('Neither addresses nor companies could be searched.', {
        cause: addresses.reason,
      })
    }

    const found = (result: PromiseSettledResult<FoundPlace[]>): FoundPlace[] =>
      result.status === 'fulfilled' ? distinctByName(result.value).slice(0, PLACES_PER_SOURCE) : []
    return /\d/.test(query)
      ? [...found(addresses), ...found(companies)]
      : [...found(companies), ...found(addresses)]
  }

  /**
   * The stops closest to a place, with an estimate of the walk to each. Only a rounded
   * position leaves the device, the distances are measured from the exact one.
   */
  async stopsNear(position: Coordinates, signal?: AbortSignal): Promise<NearbyStop[]> {
    const stops = await this.#timetable.stopsNear(roundPosition(position), signal)
    return stops
      .flatMap((stop) => {
        if (!stop.coordinates) return []
        const distance = distanceInMeters(position, stop.coordinates)
        return [{ stop, distance, walk: estimateWalk(distance) }]
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, NEARBY_STOP_COUNT)
  }
}
