import { type Journey, ridesOf } from '@/domain/journey'
import type { Direction, Route } from '@/domain/route'
import type { Instant } from '@/domain/time'
import type { Trip } from '@/domain/trip'

/** A planned trip the user keeps an eye on, with a countdown of its own. */
export interface PinnedTrip {
  readonly routeId: string
  readonly direction: Direction
  /** Identifies the trip among fresh journeys: its vehicles and their scheduled departures. */
  readonly key: string
  /** Scheduled departure of the first vehicle. */
  readonly departureAt: Instant
  /** The journey as it was pinned, shown until fresh data arrives. */
  readonly journey: Journey
}

export const journeyKey = (journey: Journey): string =>
  ridesOf(journey)
    .map((ride) => `${ride.line.name}@${ride.departure.scheduledAt}`)
    .join('>')

export function pinTrip(route: Route, direction: Direction, trip: Trip): PinnedTrip {
  return {
    routeId: route.id,
    direction,
    key: journeyKey(trip.journey),
    departureAt: ridesOf(trip.journey)[0]?.departure.scheduledAt ?? trip.departureAt,
    journey: trip.journey,
  }
}

/** The pinned journey among fresh ones, with its delays, or the pinned version itself. */
export const currentJourney = (pinned: PinnedTrip, journeys: readonly Journey[]): Journey =>
  journeys.find((journey) => journeyKey(journey) === pinned.key) ?? pinned.journey
