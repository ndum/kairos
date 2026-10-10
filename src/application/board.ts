import type { Journey } from '@/domain/journey'
import { noteworthyAlternative, splitByPreference } from '@/domain/line-preference'
import type { Endpoints } from '@/domain/route'
import { distinctByFirstDeparture, selectTrips } from '@/domain/selection'
import type { Instant } from '@/domain/time'
import { type TransferRisk, transferRiskOf } from '@/domain/transfer'
import { type Trip, planTrip } from '@/domain/trip'

/** Everything the app shows for one direction of a route at a given moment. */
export interface Board {
  /** First trip on the preferred lines that is reachable with the full reserve. */
  readonly main: Trip | null
  /** An earlier preferred trip that is only reachable without the reserve. */
  readonly tight: Trip | null
  readonly upcoming: readonly Trip[]
  /** A faster trip on other lines, or a replacement when the main trip is cancelled. */
  readonly alternative: Trip | null
  readonly transferRisk: TransferRisk
}

export function buildBoard(
  journeys: readonly Journey[],
  endpoints: Endpoints,
  preferredLines: readonly string[],
  now: Instant,
): Board {
  const trips = journeys
    .map((journey) => planTrip(journey, endpoints.origin, endpoints.destination))
    .filter((trip) => trip !== null)
  const split = splitByPreference(trips, preferredLines)
  const selection = selectTrips(distinctByFirstDeparture(split.preferred), now)

  return {
    ...selection,
    alternative: noteworthyAlternative(
      selection.main,
      distinctByFirstDeparture(split.alternatives),
      now,
    ),
    transferRisk: selection.main ? transferRiskOf(selection.main.journey) : 'ok',
  }
}

/** Leave time of the next trip worth refreshing for, used by the refresh policy. */
export const nextLeaveAt = (board: Board): Instant | null =>
  board.tight?.leaveAt ?? board.main?.leaveAt ?? null
