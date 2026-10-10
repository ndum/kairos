import { describe, expect, it } from 'vitest'

import { planTrip } from '@/domain/trip'
import { minutes } from '@/domain/time'
import { at, home, journey, morningCommute, office, ride, walk } from '@/test/builders'

import { segmentsOf, stepsOf } from './itinerary'

const plan = (j = morningCommute()) => {
  const trip = planTrip(j, home, office)
  if (!trip) throw new Error('Expected a trip')
  return trip
}

describe('segmentsOf', () => {
  it('splits a trip into walking, reserve, rides, transfers and the final walk', () => {
    const segments = segmentsOf(plan(), home, office)

    expect(segments.map(({ kind, duration }) => [kind, duration / minutes(1)])).toEqual([
      ['walk', 8],
      ['reserve', 3],
      ['ride', 9],
      ['walk', 4],
      ['wait', 1],
      ['ride', 4],
      ['walk', 5],
    ])
  })

  it('leaves out empty parts and never shows negative waiting times', () => {
    const late = morningCommute('07:05', { delay: 3 })
    const segments = segmentsOf(plan(late), { ...home, reserve: 0 }, office)

    expect(segments.map(({ kind }) => kind)).toEqual(['walk', 'ride', 'walk', 'ride', 'walk'])
  })

  it('adds walking legs before the first ride to the walk from the place', () => {
    const viaFootpath = journey(
      walk('Riverside', 'Riverside, Pier', 2),
      ride('BAT', 'Riverside, Pier', '07:10', 'Market Square', '07:30', { mode: 'ship' }),
    )

    expect(segmentsOf(plan(viaFootpath), home, office)[0]).toEqual({
      kind: 'walk',
      duration: minutes(10),
    })
  })
})

describe('stepsOf', () => {
  it('lists leaving, the rides with their transfers and the arrival', () => {
    const steps = stepsOf(plan(), home, office)

    expect(steps.map((step) => step.kind)).toEqual(['leave', 'ride', 'transfer', 'ride', 'arrive'])
    expect(steps[0]).toMatchObject({ kind: 'leave', at: at('06:54'), place: home })
    expect(steps[2]).toMatchObject({ kind: 'transfer', transfer: { walk: minutes(4), risk: 'ok' } })
    expect(steps[4]).toMatchObject({ kind: 'arrive', at: at('07:28'), place: office })
  })
})
