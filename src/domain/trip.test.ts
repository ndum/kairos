import { describe, expect, it } from 'vitest'

import {
  at,
  commute,
  ends,
  home,
  journey,
  morningCommute,
  office,
  ride,
  stop,
  walk,
} from '@/test/builders'

import { minutes } from './time'
import { planTrip } from './trip'

describe('planTrip', () => {
  it('works back from the departure with the walking time and the buffer', () => {
    expect(planTrip(morningCommute('07:05'), commute)).toMatchObject({
      departureAt: at('07:05'),
      latestLeaveAt: at('06:57'),
      leaveAt: at('06:54'),
      arrivalAt: at('07:28'),
      delay: 0,
    })
  })

  it('takes the walk to the second stop of a place when the journey starts there', () => {
    const bus = { stop: stop('Riverside, Bus Stop'), walk: minutes(3) }
    const homeWithBus = { ...home, secondStop: bus }
    const byBus = journey(
      ride('7', 'Riverside, Bus Stop', '07:05', 'Market Square', '07:25', { mode: 'bus' }),
    )

    expect(planTrip(byBus, ends(homeWithBus, office))).toMatchObject({
      latestLeaveAt: at('07:02'),
      leaveAt: at('06:59'),
    })
    expect(planTrip(morningCommute('07:05'), ends(homeWithBus, office))?.leaveAt).toBe(at('06:54'))
  })

  it('includes walks between the origin stop and the first vehicle', () => {
    const trip = planTrip(
      journey(
        walk('Market Square', 'Central', 13),
        ride('S1', 'Central', '16:45', 'Riverside', '16:53'),
      ),
      ends(office, home),
    )

    expect(trip).toMatchObject({
      latestLeaveAt: at('16:27'),
      leaveAt: at('16:24'),
      arrivalAt: at('17:01'),
    })
  })

  it('includes walks after the last vehicle in the arrival', () => {
    const trip = planTrip(
      journey(
        ride('S1', 'Riverside', '07:05', 'Central', '07:14'),
        walk('Central', 'Market Square', 17),
      ),
      commute,
    )

    expect(trip?.arrivalAt).toBe(at('07:36'))
  })

  it('leaves at the latest moment when the route keeps no buffer', () => {
    const trip = planTrip(morningCommute('07:05'), ends(home, office, 0))

    expect(trip).toMatchObject({ latestLeaveAt: at('06:57'), leaveAt: at('06:57') })
  })

  it('ignores delays below two minutes', () => {
    const trip = planTrip(morningCommute('07:05', { delay: 1 }), commute)

    expect(trip).toMatchObject({ departureAt: at('07:05'), leaveAt: at('06:54'), delay: 0 })
  })

  it('moves the leave time for delays of two minutes or more and keeps the buffer', () => {
    const trip = planTrip(morningCommute('07:05', { delay: 3 }), commute)

    expect(trip).toMatchObject({
      departureAt: at('07:08'),
      latestLeaveAt: at('07:00'),
      leaveAt: at('06:57'),
      delay: minutes(3),
    })
  })

  it('ignores early departures', () => {
    const trip = planTrip(morningCommute('07:05', { delay: -2 }), commute)

    expect(trip).toMatchObject({ departureAt: at('07:05'), delay: 0 })
  })

  it('uses the real-time arrival', () => {
    const trip = planTrip(
      journey(ride('S1', 'Central', '16:45', 'Riverside', '16:53', { arrivalDelay: 4 })),
      ends(office, home),
    )

    expect(trip?.arrivalAt).toBe(at('17:05'))
  })

  it('returns null for a journey without vehicles', () => {
    expect(planTrip(journey(walk('Central', 'Market Square', 17)), commute)).toBeNull()
  })
})
