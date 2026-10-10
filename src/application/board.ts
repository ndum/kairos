import type { Journey } from '@/domain/journey'
import { noteworthyAlternative, splitByPreference } from '@/domain/line-preference'
import type { Endpoints } from '@/domain/route'
import type { ScheduleTarget } from '@/domain/schedule'
import {
  type TripSelection,
  distinctByFirstDeparture,
  selectInTime,
  selectTrips,
  withoutSlowerTrips,
} from '@/domain/selection'
import type { Instant } from '@/domain/time'
import { type TransferRisk, transferRiskOf } from '@/domain/transfer'
import { type Trip, planTrip } from '@/domain/trip'

/** Everything the app shows for one direction of a route at a given moment. */
export interface Board {
  /** Fastest trip on the preferred lines that is reachable with the full buffer. */
  readonly main: Trip | null
  /** An earlier preferred trip that is only reachable without the buffer. */
  readonly tight: Trip | null
  /** Trips after the main one, or the earlier ones when the schedule sets an arrival time. */
  readonly upcoming: readonly Trip[]
  /** A faster trip on other lines, or a replacement when the main trip is cancelled. */
  readonly alternative: Trip | null
  readonly transferRisk: TransferRisk
  /** What today's schedule asks of this direction, if anything. */
  readonly target: ScheduleTarget | null
  /** No trip arrives in time any more, so the board shows the next ones instead. */
  readonly late: boolean
}

/**
 * Picks the trips of a direction. Without a schedule, the board starts with the next trip.
 * With an arrival time, it starts with the latest trip that arrives in time. With a time for
 * the way back, it starts with the first trip after it.
 */
export function buildBoard(
  journeys: readonly Journey[],
  endpoints: Endpoints,
  preferredLines: readonly string[],
  now: Instant,
  target: ScheduleTarget | null = null,
): Board {
  const trips = journeys
    .map((journey) => planTrip(journey, endpoints))
    .filter((trip) => trip !== null)
  const split = splitByPreference(trips, preferredLines)
  const preferred = withoutSlowerTrips(distinctByFirstDeparture(split.preferred))
  const alternatives = distinctByFirstDeparture(split.alternatives)

  const board = (selection: TripSelection, from: Instant, late = false): Board => ({
    ...selection,
    alternative: noteworthyAlternative(selection.main, alternatives, from),
    transferRisk: selection.main ? transferRiskOf(selection.main.journey) : 'ok',
    target,
    late,
  })

  if (target?.kind === 'arrive') {
    const inTime = selectInTime(preferred, now, target.by)
    // Without any journeys, nothing tells whether the user is late yet.
    if (inTime.main || inTime.tight || trips.length === 0) return board(inTime, now)
    return board(selectTrips(preferred, now), now, true)
  }
  if (target?.kind === 'return') {
    // Nobody leaves before the time of the schedule, so no earlier trip is a tight one.
    const selection = selectTrips(preferred, target.from)
    return board({ ...selection, tight: null }, target.from)
  }
  return board(selectTrips(preferred, now), now)
}

/** Leave time of the next trip worth refreshing for, used by the refresh policy. */
export const nextLeaveAt = (board: Board): Instant | null =>
  board.tight?.leaveAt ?? board.main?.leaveAt ?? null
