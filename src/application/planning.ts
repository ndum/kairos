import { splitByPreference } from '@/domain/line-preference'
import type { Endpoints } from '@/domain/route'
import { distinctByFirstDeparture, withoutSlowerTrips } from '@/domain/selection'
import type { Instant } from '@/domain/time'
import { type Trip, planTrip } from '@/domain/trip'

import type { JourneyQuery, TimetablePort } from './ports/timetable'

/** Leave at or after a time, or arrive at the destination place by a time. */
export type PlanMode = 'depart' | 'arrive'

export interface PlanRequest {
  readonly mode: PlanMode
  readonly at: Instant
}

export interface Plan {
  /** Trips on the preferred lines, in the order of their leave time. */
  readonly trips: readonly Trip[]
  /** Trips that also use other lines. */
  readonly alternatives: readonly Trip[]
  /** The first trip to leave, or for an arrival time the last one that still arrives. */
  readonly recommended: Trip | null
}

/** Journeys asked for per plan. */
export const PLAN_LIMIT = 6

/**
 * Plans trips for one direction of a route. Times refer to the places, so walking times and
 * the buffer are taken into account before asking the timetable.
 */
export async function planTrips(
  timetable: TimetablePort,
  ends: Endpoints,
  preferredLines: readonly string[],
  request: PlanRequest,
  signal?: AbortSignal,
): Promise<Plan> {
  const { origin, destination, buffer } = ends
  const between = { from: origin.stop, to: destination.stop, limit: PLAN_LIMIT }
  const query: JourneyQuery =
    request.mode === 'depart'
      ? { ...between, at: request.at + origin.walk + buffer }
      : { ...between, at: request.at - destination.walk, arriveBy: true }

  const fits = (trip: Trip): boolean =>
    request.mode === 'depart' ? trip.leaveAt >= request.at : trip.arrivalAt <= request.at

  const journeys = await timetable.findJourneys(query, signal)
  const trips = journeys
    .map((journey) => planTrip(journey, ends))
    .filter((trip) => trip !== null)
    .filter(fits)

  // Splitting first keeps the preferred variant of a vehicle that another variant would
  // otherwise replace, for example the same train with a bus instead of a walk at the end.
  const split = splitByPreference(trips, preferredLines)
  const byLeaveTime = (a: Trip, b: Trip): number => a.leaveAt - b.leaveAt
  const fastest = (group: readonly Trip[]): Trip[] =>
    withoutSlowerTrips(distinctByFirstDeparture(group)).sort(byLeaveTime)
  const preferred = fastest(split.preferred)
  const alternatives = fastest(split.alternatives)

  const recommended = request.mode === 'depart' ? preferred[0] : preferred.at(-1)
  return { trips: preferred, alternatives, recommended: recommended ?? null }
}
