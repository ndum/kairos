import { describe, expect, it } from 'vitest'

import { type Trip, planTrip } from '@/domain/trip'
import { at, commute, morningCommute, route } from '@/test/builders'

import { replacesRide, rideOf } from './ride'

const tripAt = (departure: string): Trip => {
  const trip = planTrip(morningCommute(departure), commute)
  if (!trip) throw new Error('Expected a trip')
  return trip
}

const commuteRoute = route('commute')

describe('replacesRide', () => {
  const first = tripAt('07:05')
  const next = tripAt('07:12')

  it('follows the main trip once the user is about to leave for it', () => {
    expect(replacesRide(null, first, first.leaveAt - 11 * 60_000)).toBe(false)
    expect(replacesRide(null, first, first.leaveAt - 10 * 60_000)).toBe(true)
  })

  it('takes the next trip while the user has not left for the remembered one', () => {
    const ride = rideOf(commuteRoute, 'outbound', first)

    expect(replacesRide(ride, next, first.leaveAt - 60_000)).toBe(true)
  })

  it('keeps the remembered ride once the user had to leave for it', () => {
    const ride = rideOf(commuteRoute, 'outbound', first)

    expect(replacesRide(ride, next, first.leaveAt + 60_000)).toBe(false)
  })

  it('updates the same trip only when its leave time changes', () => {
    const ride = rideOf(commuteRoute, 'outbound', first)
    const delayed = planTrip(morningCommute('07:05', { delay: 3 }), commute)
    if (!delayed) throw new Error('Expected a trip')

    expect(replacesRide(ride, first, at('06:50'))).toBe(false)
    expect(replacesRide(ride, delayed, at('06:50'))).toBe(true)
  })
})
