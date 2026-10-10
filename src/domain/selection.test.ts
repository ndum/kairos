import { describe, expect, it } from 'vitest'

import type { Leg } from '@/domain/journey'
import { at, home, journey, morningCommute, ride, walk, office } from '@/test/builders'

import { distinctByFirstDeparture, selectTrips, withoutSlowerTrips } from './selection'
import { type Trip, planTrip } from './trip'

const tripAt = (departure: string): Trip => {
  const trip = planTrip(morningCommute(departure), home, office)
  if (!trip) throw new Error('Expected a trip')
  return trip
}

const departures = (trips: readonly Trip[]) => trips.map((trip) => trip.departureAt)

describe('selectTrips', () => {
  const trips = [tripAt('07:29'), tripAt('06:59'), tripAt('07:35'), tripAt('07:05')]

  it('picks the first trip reachable with the reserve and the next two', () => {
    const selection = selectTrips(trips, at('06:40'))

    expect(selection.main?.departureAt).toBe(at('06:59'))
    expect(departures(selection.upcoming)).toEqual([at('07:05'), at('07:29')])
    expect(selection.tight).toBeNull()
  })

  it('reports an earlier trip that is only reachable without the reserve', () => {
    const selection = selectTrips(trips, at('06:50'))

    expect(selection.tight?.departureAt).toBe(at('06:59'))
    expect(selection.main?.departureAt).toBe(at('07:05'))
  })

  it('drops trips that can no longer be reached', () => {
    const selection = selectTrips(trips, at('06:52'))

    expect(selection.tight).toBeNull()
    expect(selection.main?.departureAt).toBe(at('07:05'))
  })

  it('keeps the tight trip when nothing later is known', () => {
    const selection = selectTrips([tripAt('06:59')], at('06:50'))

    expect(selection).toEqual({ main: null, tight: trips[1], upcoming: [] })
  })

  it('handles an empty timetable', () => {
    expect(selectTrips([], at('06:40'))).toEqual({ main: null, tight: null, upcoming: [] })
  })
})

describe('distinctByFirstDeparture', () => {
  it('keeps the fastest variant of the same first vehicle', () => {
    const byBus = tripAt('07:05')
    const onFoot = planTrip(
      journey(
        ride('S1', 'Riverside', '07:05', 'Central', '07:14'),
        walk('Central', 'Market Square', 17),
      ),
      home,
      office,
    )
    if (!onFoot) throw new Error('Expected a trip')

    expect(distinctByFirstDeparture([onFoot, byBus, tripAt('07:29')])).toEqual([
      byBus,
      tripAt('07:29'),
    ])
  })
})

describe('withoutSlowerTrips', () => {
  const trip = (...legs: Leg[]): Trip => {
    const planned = planTrip(journey(...legs), home, office)
    if (!planned) throw new Error('Expected a trip')
    return planned
  }

  it('drops a trip that leaves earlier but does not arrive earlier', () => {
    const slow = trip(ride('S1', 'Riverside', '07:05', 'Market Square', '07:35'))
    const fast = trip(ride('IR 1', 'Riverside', '07:10', 'Market Square', '07:30'))

    expect(withoutSlowerTrips([slow, fast])).toEqual([fast])
  })

  it('keeps a trip that leaves earlier and arrives earlier', () => {
    const early = trip(ride('S1', 'Riverside', '07:05', 'Market Square', '07:25'))
    const late = trip(ride('IR 1', 'Riverside', '07:10', 'Market Square', '07:28'))

    expect(withoutSlowerTrips([early, late])).toEqual([early, late])
  })

  it('keeps the trip with fewer changes when two leave and arrive at the same time', () => {
    const direct = trip(ride('IR 1', 'Riverside', '07:10', 'Market Square', '07:30'))
    const withChange = trip(
      ride('S1', 'Riverside', '07:10', 'Central', '07:18'),
      ride('5', 'Central', '07:21', 'Market Square', '07:30', { mode: 'bus' }),
    )

    expect(withoutSlowerTrips([withChange, direct])).toEqual([direct])
  })

  it('keeps the first of two trips that are equal in every respect', () => {
    const first = trip(ride('S1', 'Riverside', '07:10', 'Market Square', '07:30'))
    const second = trip(ride('S2', 'Riverside', '07:10', 'Market Square', '07:30'))

    expect(withoutSlowerTrips([first, second])).toEqual([first])
  })

  it('never drops a trip in favour of a cancelled one', () => {
    const slow = trip(ride('S1', 'Riverside', '07:05', 'Market Square', '07:35'))
    const cancelled = trip(
      ride('IR 1', 'Riverside', '07:10', 'Market Square', '07:30', { cancelled: true }),
    )

    expect(withoutSlowerTrips([slow, cancelled])).toEqual([slow, cancelled])
  })
})
