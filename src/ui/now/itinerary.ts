import {
  type RideLeg,
  expectedTime,
  firstStopOf,
  isRide,
  lastStopOf,
  walkingTime,
} from '@/domain/journey'
import { type Endpoints, type Place, walkTo } from '@/domain/route'
import type { Duration, Instant } from '@/domain/time'
import { type Transfer, transfersOf } from '@/domain/transfer'
import type { Trip } from '@/domain/trip'

// Turns a trip into the parts the board draws: segments for the bar, steps for the timeline.

export type Segment =
  | { readonly kind: 'walk' | 'buffer' | 'wait'; readonly duration: Duration }
  | { readonly kind: 'ride'; readonly duration: Duration; readonly leg: RideLeg }

/** Parts of a trip from leaving the place to arriving at the destination, in order. */
export function segmentsOf(trip: Trip, { origin, destination, buffer }: Endpoints): Segment[] {
  const legs = trip.journey.legs
  const first = legs.findIndex(isRide)
  const last = legs.findLastIndex(isRide)
  const segments: Segment[] = [
    {
      kind: 'walk',
      duration: walkTo(origin, firstStopOf(trip.journey)?.id) + walkingTime(legs.slice(0, first)),
    },
    { kind: 'buffer', duration: buffer },
  ]

  let arrivedAt: Instant | null = null
  for (const leg of legs.slice(first, last + 1)) {
    if (leg.kind === 'walk') {
      segments.push({ kind: 'walk', duration: leg.duration })
      if (arrivedAt !== null) arrivedAt += leg.duration
      continue
    }
    const departure = expectedTime(leg.departure)
    if (arrivedAt !== null) segments.push({ kind: 'wait', duration: departure - arrivedAt })
    segments.push({ kind: 'ride', duration: expectedTime(leg.arrival) - departure, leg })
    arrivedAt = expectedTime(leg.arrival)
  }

  segments.push({
    kind: 'walk',
    duration: walkingTime(legs.slice(last + 1)) + walkTo(destination, lastStopOf(trip.journey)?.id),
  })
  return segments.filter((segment) => segment.duration > 0)
}

export type Step =
  | { readonly kind: 'leave'; readonly at: Instant; readonly place: Place }
  | { readonly kind: 'ride'; readonly leg: RideLeg }
  | { readonly kind: 'transfer'; readonly transfer: Transfer }
  | { readonly kind: 'arrive'; readonly at: Instant; readonly place: Place }

/** The trip as a timeline: leaving, each ride with the transfer after it, and the arrival. */
export function stepsOf(trip: Trip, { origin, destination }: Endpoints): Step[] {
  const transfers = transfersOf(trip.journey)
  const rides = trip.journey.legs.filter(isRide)
  const steps: Step[] = [{ kind: 'leave', at: trip.leaveAt, place: origin }]

  rides.forEach((leg, index) => {
    steps.push({ kind: 'ride', leg })
    const transfer = transfers[index]
    if (transfer) steps.push({ kind: 'transfer', transfer })
  })

  steps.push({ kind: 'arrive', at: trip.arrivalAt, place: destination })
  return steps
}
