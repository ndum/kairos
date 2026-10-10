import { describe, expect, it, vi } from 'vitest'

import { minutes } from '@/domain/time'
import {
  at,
  commute,
  home,
  journey,
  morningCommute,
  office,
  ride,
  stop,
  walk,
} from '@/test/builders'

import { PLAN_LIMIT, planTrips } from './planning'
import type { TimetablePort } from './ports/timetable'

const ends = commute

const viaTram = (departure: string, arrival: string) =>
  journey(
    ride('S1', 'Riverside', departure, 'Central', '07:30'),
    walk('Central', 'Central, Bus Station', 1),
    ride('9', 'Central, Bus Station', '07:33', 'Market Square', arrival, { mode: 'tram' }),
  )

function timetable(journeys = [morningCommute('07:05'), morningCommute('07:20')]) {
  const findJourneys = vi.fn<TimetablePort['findJourneys']>().mockResolvedValue(journeys)
  return { timetable: { findJourneys, searchStops: vi.fn(), stopsNear: vi.fn() }, findJourneys }
}

describe('planTrips', () => {
  it('asks for departures once the user has walked to the stop and kept the buffer', async () => {
    const { timetable: source, findJourneys } = timetable()
    const signal = new AbortController().signal

    await planTrips(source, ends, [], { mode: 'depart', at: at('06:50') }, signal)

    expect(findJourneys).toHaveBeenCalledWith(
      { from: home.stop, to: office.stop, at: at('07:01'), limit: PLAN_LIMIT },
      signal,
    )
  })

  it('asks for every pair of stops with the walk to each of them', async () => {
    const { timetable: source, findJourneys } = timetable()
    const bus = { stop: stop('Riverside, Bus Stop'), walk: minutes(3) }

    await planTrips(source, { ...ends, origin: { ...home, secondStop: bus } }, [], {
      mode: 'depart',
      at: at('06:50'),
    })

    expect(findJourneys).toHaveBeenCalledTimes(2)
    expect(findJourneys).toHaveBeenCalledWith(
      { from: bus.stop, to: office.stop, at: at('06:56'), limit: PLAN_LIMIT },
      undefined,
    )
  })

  it('offers trips that leave no earlier than asked, the first one recommended', async () => {
    const { timetable: source } = timetable([
      morningCommute('07:05'),
      morningCommute('07:20'),
      morningCommute('07:35'),
    ])

    const plan = await planTrips(source, ends, [], { mode: 'depart', at: at('06:55') })

    expect(plan.trips.map((trip) => trip.leaveAt)).toEqual([at('07:09'), at('07:24')])
    expect(plan.recommended?.leaveAt).toBe(at('07:09'))
  })

  it('asks for arrivals at the stop, before the final walk', async () => {
    const { timetable: source, findJourneys } = timetable()

    await planTrips(source, ends, [], { mode: 'arrive', at: at('08:00') })

    expect(findJourneys).toHaveBeenCalledWith(
      { from: home.stop, to: office.stop, at: at('07:55'), limit: PLAN_LIMIT, arriveBy: true },
      undefined,
    )
  })

  it('offers trips that arrive in time, the last one to leave recommended', async () => {
    const { timetable: source } = timetable([
      morningCommute('07:05'),
      morningCommute('07:20'),
      morningCommute('07:35'),
    ])

    // The commutes arrive at 07:28, 07:43 and 07:58 including the walk of five minutes.
    const plan = await planTrips(source, ends, [], { mode: 'arrive', at: at('07:50') })

    expect(plan.trips.map((trip) => trip.arrivalAt)).toEqual([at('07:28'), at('07:43')])
    expect(plan.recommended?.arrivalAt).toBe(at('07:43'))
  })

  it('prefers the chosen lines and keeps other trips as alternatives', async () => {
    const { timetable: source } = timetable([morningCommute('07:20'), viaTram('07:21', '07:40')])

    const plan = await planTrips(source, ends, ['S1', '20'], { mode: 'depart', at: at('06:50') })

    expect(plan.trips).toHaveLength(1)
    expect(plan.alternatives.map((trip) => trip.departureAt)).toEqual([at('07:21')])
    expect(plan.recommended?.departureAt).toBe(at('07:20'))
  })

  it('keeps the preferred variant of a train that another variant would replace', async () => {
    // The same S1, once with bus 20 and once with tram 9, which arrives earlier.
    const { timetable: source } = timetable([morningCommute('07:20'), viaTram('07:20', '07:36')])

    const plan = await planTrips(source, ends, ['S1', '20'], { mode: 'depart', at: at('06:50') })

    expect(plan.recommended?.journey).toEqual(morningCommute('07:20'))
    expect(plan.alternatives).toHaveLength(1)
  })

  it('leaves out trips that leave earlier but do not arrive earlier', async () => {
    const slow = journey(ride('S1', 'Riverside', '07:05', 'Market Square', '07:45'))
    const fast = journey(ride('IR 2', 'Riverside', '07:10', 'Market Square', '07:30'))
    const { timetable: source } = timetable([slow, fast])

    const plan = await planTrips(source, ends, [], { mode: 'depart', at: at('06:40') })

    expect(plan.trips.map((trip) => trip.journey)).toEqual([fast])
    expect(plan.recommended?.journey).toBe(fast)
  })

  it('recommends nothing when no trip fits', async () => {
    const { timetable: source } = timetable([])

    const plan = await planTrips(source, ends, [], { mode: 'arrive', at: at('06:00') })

    expect(plan).toEqual({ trips: [], alternatives: [], recommended: null })
  })
})
