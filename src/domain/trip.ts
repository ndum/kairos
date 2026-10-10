import {
  type Journey,
  delayOf,
  expectedTime,
  firstStopOf,
  isRide,
  lastStopOf,
  walkingTime,
} from './journey'
import { type Endpoints, walkTo } from './route'
import { type Duration, type Instant, minutes } from './time'

/**
 * Smaller delays are ignored for the leave time, because vehicles often make them up.
 * The arrival always uses the real-time prognosis.
 */
export const DELAY_THRESHOLD: Duration = minutes(2)

/** A journey evaluated from the origin place to the destination place. */
export interface Trip {
  readonly journey: Journey
  /** Leaving at this time keeps the full buffer. */
  readonly leaveAt: Instant
  /** Leaving at this time uses up the whole buffer. */
  readonly latestLeaveAt: Instant
  /** Departure of the first vehicle, including a relevant delay. */
  readonly departureAt: Instant
  /** Arrival at the destination place, including the final walk. */
  readonly arrivalAt: Instant
  /** Delay of the first vehicle that is taken into account. */
  readonly delay: Duration
}

/** Returns null for journeys without any vehicle, which are no transit options. */
export function planTrip(
  journey: Journey,
  { origin, destination, buffer }: Endpoints,
): Trip | null {
  const firstRideIndex = journey.legs.findIndex(isRide)
  const lastRideIndex = journey.legs.findLastIndex(isRide)
  const firstRide = journey.legs[firstRideIndex]
  const lastRide = journey.legs[lastRideIndex]
  if (firstRide?.kind !== 'ride' || lastRide?.kind !== 'ride') return null

  const reportedDelay = delayOf(firstRide.departure)
  const delay = reportedDelay >= DELAY_THRESHOLD ? reportedDelay : 0
  const departureAt = firstRide.departure.scheduledAt + delay
  // A place with two stops has a walk of its own to each of them.
  const walkToFirstRide =
    walkingTime(journey.legs.slice(0, firstRideIndex)) + walkTo(origin, firstStopOf(journey)?.id)
  const walkFromLastRide =
    walkingTime(journey.legs.slice(lastRideIndex + 1)) +
    walkTo(destination, lastStopOf(journey)?.id)
  const latestLeaveAt = departureAt - walkToFirstRide

  return {
    journey,
    leaveAt: latestLeaveAt - buffer,
    latestLeaveAt,
    departureAt,
    arrivalAt: expectedTime(lastRide.arrival) + walkFromLastRide,
    delay,
  }
}
