import { describe, expect, it } from 'vitest'

import { planTrip } from '@/domain/trip'
import { at, home, morningCommute, office, route } from '@/test/builders'

import { currentJourney, journeyKey, pinTrip } from './pinned-trip'

const commute = route('commute')

const plan = (journey = morningCommute('07:20')) => {
  const trip = planTrip(journey, home, office)
  if (!trip) throw new Error('Expected a trip')
  return trip
}

describe('pinTrip', () => {
  it('remembers the route, the direction and the vehicles of the trip', () => {
    expect(pinTrip(commute, 'outbound', plan())).toEqual({
      routeId: 'commute',
      direction: 'outbound',
      key: `S1@${at('07:20')}>20@${at('07:34')}`,
      departureAt: at('07:20'),
      journey: morningCommute('07:20'),
    })
  })
})

describe('currentJourney', () => {
  const pinned = pinTrip(commute, 'outbound', plan())

  it('finds the pinned trip among fresh journeys, with its delays', () => {
    const delayed = morningCommute('07:20', { delay: 4 })

    expect(currentJourney(pinned, [morningCommute('07:05'), delayed])).toBe(delayed)
    expect(journeyKey(delayed)).toBe(pinned.key)
  })

  it('keeps the pinned version when the trip is not among them', () => {
    expect(currentJourney(pinned, [morningCommute('07:35')])).toBe(pinned.journey)
  })
})
