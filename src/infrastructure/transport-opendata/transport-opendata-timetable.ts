import * as v from 'valibot'

import type { FoundPlace, PlaceSearchPort } from '@/application/ports/place-search'
import {
  type JourneyQuery,
  TimetableError,
  type TimetablePort,
} from '@/application/ports/timetable'
import type { Coordinates } from '@/domain/geo'
import type { Journey } from '@/domain/journey'
import { toLocal } from '@/domain/local-time'
import type { StopRef } from '@/domain/route'
import { type Duration, SECOND } from '@/domain/time'

import { HttpError, fetchJson } from '../http/fetch-json'
import { toFoundPlace, toJourney, toStop } from './mapping'
import { ConnectionsResponseSchema, LocationsResponseSchema } from './schema'

const DEFAULT_BASE_URL = 'https://transport.opendata.ch/v1'
const DEFAULT_TIMEOUT: Duration = 8 * SECOND
const DEFAULT_LIMIT = 6

// Asking for these fields only reduces a response to about a quarter of its size.
const CONNECTION_FIELDS = [
  'connections/sections/departure/station',
  'connections/sections/departure/departureTimestamp',
  'connections/sections/departure/delay',
  'connections/sections/departure/platform',
  'connections/sections/departure/prognosis',
  'connections/sections/arrival/station',
  'connections/sections/arrival/arrivalTimestamp',
  'connections/sections/arrival/platform',
  'connections/sections/arrival/prognosis',
  'connections/sections/journey/name',
  'connections/sections/journey/category',
  'connections/sections/journey/number',
  'connections/sections/journey/to',
  'connections/sections/journey/operator',
  'connections/sections/journey/passList/station/id',
  'connections/sections/journey/passList/station/name',
  'connections/sections/journey/passList/arrivalTimestamp',
  'connections/sections/journey/passList/departureTimestamp',
  'connections/sections/journey/passList/platform',
  'connections/sections/journey/passList/delay',
  'connections/sections/walk',
]
const LOCATION_FIELDS = ['stations/id', 'stations/name', 'stations/coordinate']
const PLACE_FIELDS = ['stations/name', 'stations/coordinate']

export interface TransportOpendataOptions {
  readonly baseUrl?: string
  readonly timeout?: Duration
  readonly fetch?: typeof globalThis.fetch
}

/**
 * Timetable adapter for the Transport API of Opendata.ch (transport.opendata.ch). The same
 * API also finds companies and buildings by name.
 */
export class TransportOpendataTimetable implements TimetablePort, PlaceSearchPort {
  readonly #baseUrl: string
  readonly #timeout: Duration
  readonly #fetch: typeof globalThis.fetch

  constructor(options: TransportOpendataOptions = {}) {
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.#timeout = options.timeout ?? DEFAULT_TIMEOUT
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  async findJourneys(query: JourneyQuery, signal?: AbortSignal): Promise<Journey[]> {
    const { date, time } = toLocal(query.at)
    const params = new URLSearchParams({
      from: query.from.id,
      to: query.to.id,
      date,
      time,
      isArrivalTime: query.arriveBy ? '1' : '0',
      limit: String(query.limit ?? DEFAULT_LIMIT),
    })
    for (const field of CONNECTION_FIELDS) params.append('fields[]', field)

    const body = await this.#get(`connections?${params.toString()}`, signal)
    return this.#parse(ConnectionsResponseSchema, body).connections.map(toJourney)
  }

  async searchStops(text: string, signal?: AbortSignal): Promise<StopRef[]> {
    const params = new URLSearchParams({ query: text, type: 'station' })
    for (const field of LOCATION_FIELDS) params.append('fields[]', field)

    const body = await this.#get(`locations?${params.toString()}`, signal)
    return this.#parse(LocationsResponseSchema, body)
      .stations.filter((station) => station.id && station.name)
      .map(toStop)
  }

  async stopsNear(position: Coordinates, signal?: AbortSignal): Promise<StopRef[]> {
    // The API calls latitude x and longitude y.
    const params = new URLSearchParams({
      x: String(position.latitude),
      y: String(position.longitude),
      type: 'station',
    })
    for (const field of LOCATION_FIELDS) params.append('fields[]', field)

    const body = await this.#get(`locations?${params.toString()}`, signal)
    // The address at the position comes first, as a station without an id.
    return this.#parse(LocationsResponseSchema, body)
      .stations.filter((station) => station.id && station.name)
      .map(toStop)
      .filter((stop) => stop.coordinates)
  }

  async searchPlaces(text: string, signal?: AbortSignal): Promise<FoundPlace[]> {
    const params = new URLSearchParams({ query: text, type: 'poi' })
    for (const field of PLACE_FIELDS) params.append('fields[]', field)

    const body = await this.#get(`locations?${params.toString()}`, signal)
    return this.#parse(LocationsResponseSchema, body).stations.flatMap(toFoundPlace)
  }

  async #get(path: string, signal?: AbortSignal): Promise<unknown> {
    try {
      return await fetchJson(`${this.#baseUrl}/${path}`, {
        fetch: this.#fetch,
        timeout: this.#timeout,
        signal,
      })
    } catch (error) {
      if (!(error instanceof HttpError)) throw error
      throw new TimetableError(error.reason, error.message, { cause: error })
    }
  }

  #parse<TSchema extends v.GenericSchema>(schema: TSchema, body: unknown): v.InferOutput<TSchema> {
    const result = v.safeParse(schema, body)
    if (!result.success) {
      throw new TimetableError(
        'invalid-response',
        `Unexpected timetable data: ${v.summarize(result.issues)}`,
      )
    }
    return result.output
  }
}
