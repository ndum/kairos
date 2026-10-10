import { ridesOf } from './journey'
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

const isCancelled = (trip: Trip): boolean => ridesOf(trip.journey).some((ride) => ride.cancelled)
const rideCount = (trip: Trip): number => ridesOf(trip.journey).length

/**
 * Whether a candidate makes a trip redundant: it leaves at the same time or later and
 * arrives at the same time or earlier. Between equal trips, fewer rides and then the order
 * of the timetable decide.
 */
function replaces(candidate: Trip, trip: Trip, candidateComesFirst: boolean): boolean {
  if (isCancelled(candidate)) return false
  if (candidate.leaveAt < trip.leaveAt || candidate.arrivalAt > trip.arrivalAt) return false
  if (candidate.leaveAt > trip.leaveAt || candidate.arrivalAt < trip.arrivalAt) return true
  const rides = rideCount(candidate) - rideCount(trip)
  return rides < 0 || (rides === 0 && candidateComesFirst)
}

/**
 * Leaves out trips that are never the better choice, so the fastest way stays: another trip
 * leaves at the same time or later and arrives at the same time or earlier. A cancelled trip
 * never replaces another one.
 */
export function withoutSlowerTrips(trips: readonly Trip[]): Trip[] {
  return trips.filter(
    (trip, index) =>
      !trips.some(
        (candidate, candidateIndex) =>
          candidateIndex !== index && replaces(candidate, trip, candidateIndex < index),
      ),
  )
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
