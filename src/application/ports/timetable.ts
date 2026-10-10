import type { Coordinates } from '@/domain/geo'
import type { Journey } from '@/domain/journey'
import type { StopRef } from '@/domain/route'
import type { Instant } from '@/domain/time'

export interface JourneyQuery {
  readonly from: StopRef
  readonly to: StopRef
  /** Earliest departure, or the latest arrival when arriveBy is set. */
  readonly at: Instant
  readonly arriveBy?: boolean
  /** Maximum number of journeys to return. */
  readonly limit?: number
}

/** Access to a public transport timetable with real-time data. */
export interface TimetablePort {
  findJourneys(query: JourneyQuery, signal?: AbortSignal): Promise<Journey[]>
  searchStops(text: string, signal?: AbortSignal): Promise<StopRef[]>
  /** Stops around a position, the closest first, each with its own position. */
  stopsNear(position: Coordinates, signal?: AbortSignal): Promise<StopRef[]>
}

export type TimetableErrorReason = 'network' | 'timeout' | 'http' | 'invalid-response'

/** Raised by timetable adapters. Aborts requested by the caller are rethrown unchanged. */
export class TimetableError extends Error {
  override readonly name = 'TimetableError'

  constructor(
    readonly reason: TimetableErrorReason,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}
