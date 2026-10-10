import type { Instant } from './time'
import type { Trip } from './trip'
import { urgencyOf } from './urgency'

export interface TripSelection {
  /** First trip that is still reachable with the full reserve. */
  readonly main: Trip | null
  /** An earlier trip that is only reachable without the reserve. */
  readonly tight: Trip | null
  /** Trips after the main one, in order of their leave time. */
  readonly upcoming: readonly Trip[]
}

export const UPCOMING_COUNT = 2

const byLeaveTime = (a: Trip, b: Trip): number => a.leaveAt - b.leaveAt

export function selectTrips(
  trips: readonly Trip[],
  now: Instant,
  upcomingCount = UPCOMING_COUNT,
): TripSelection {
  const reachable = trips.filter((trip) => urgencyOf(trip, now) !== 'missed').sort(byLeaveTime)
  const mainIndex = reachable.findIndex((trip) => now <= trip.leaveAt)
  const main = reachable[mainIndex] ?? null
  const earlier = main ? reachable.slice(0, mainIndex) : reachable

  return {
    main,
    tight: earlier.at(-1) ?? null,
    upcoming: main ? reachable.slice(mainIndex + 1, mainIndex + 1 + upcomingCount) : [],
  }
}

/**
 * Timetables often contain the same vehicle several times, for example once with a bus and
 * once with a walk at the end. Keeps the variant that arrives first for every first vehicle.
 */
export function distinctByFirstDeparture(trips: readonly Trip[]): Trip[] {
  const fastest = new Map<string, Trip>()
  for (const trip of trips) {
    const key = firstDepartureKey(trip)
    const known = fastest.get(key)
    if (!known || trip.arrivalAt < known.arrivalAt) fastest.set(key, trip)
  }
  return [...fastest.values()]
}

const firstDepartureKey = (trip: Trip): string => {
  const first = trip.journey.legs.find((leg) => leg.kind === 'ride')
  return first ? `${first.line.name}@${String(first.departure.scheduledAt)}` : ''
}
