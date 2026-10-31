import { type Journey, expectedTime, ridesOf } from '@/domain/journey'
import type { StopRef } from '@/domain/route'
import type { Transfer } from '@/domain/transfer'

import type { TimetablePort } from './ports/timetable'

/** A few journeys are enough, only the first one the user can still reach counts. */
const LIMIT = 4

/**
 * After a transfer that no longer works: the first journey from the stop of the connecting
 * vehicle that the user can reach once they are there.
 */
export async function findNextConnection(
  timetable: TimetablePort,
  transfer: Transfer,
  to: StopRef,
  signal?: AbortSignal,
): Promise<Journey | null> {
  const ready = expectedTime(transfer.arrival) + transfer.walk
  const journeys = await timetable.findJourneys(
    { from: transfer.departure.stop, to, at: ready, limit: LIMIT },
    signal,
  )
  return (
    journeys.find((journey) => {
      const first = ridesOf(journey)[0]
      return first !== undefined && !first.cancelled && expectedTime(first.departure) >= ready
    }) ?? null
  )
}
