import * as v from 'valibot'

import {
  type JourneyQuery,
  TimetableError,
  type TimetablePort,
} from '@/application/ports/timetable'
import type { Journey } from '@/domain/journey'
import { toLocal } from '@/domain/local-time'
import type { StopRef } from '@/domain/route'
import { type Duration, SECOND } from '@/domain/time'

import { toJourney, toStop } from './mapping'
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
  'connections/sections/journey/category',
  'connections/sections/journey/number',
  'connections/sections/journey/to',
  'connections/sections/journey/operator',
  'connections/sections/walk',
]
const LOCATION_FIELDS = ['stations/id', 'stations/name', 'stations/coordinate']

export interface TransportOpendataOptions {
  readonly baseUrl?: string
  readonly timeout?: Duration
  readonly fetch?: typeof globalThis.fetch
}

/** Timetable adapter for the Transport API of Opendata.ch (transport.opendata.ch). */
export class TransportOpendataTimetable implements TimetablePort {
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

  async #get(path: string, signal?: AbortSignal): Promise<unknown> {
    const timeout = AbortSignal.timeout(this.#timeout)
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

    let response: Response
    try {
      response = await this.#fetch(`${this.#baseUrl}/${path}`, { signal: combined })
    } catch (error) {
      if (signal?.aborted) throw error
      if (timeout.aborted) {
        throw new TimetableError('timeout', 'The timetable did not respond in time.', {
          cause: error,
        })
      }
      throw new TimetableError('network', 'The timetable could not be reached.', { cause: error })
    }

    if (!response.ok) {
      throw new TimetableError('http', `The timetable answered with status ${response.status}.`)
    }
    try {
      return await response.json()
    } catch (error) {
      throw new TimetableError('invalid-response', 'The timetable sent malformed data.', {
        cause: error,
      })
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
