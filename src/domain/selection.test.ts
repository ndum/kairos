import { describe, expect, it } from 'vitest'

import { at, home, journey, morningCommute, ride, walk, office } from '@/test/builders'

import { distinctByFirstDeparture, selectTrips } from './selection'
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
