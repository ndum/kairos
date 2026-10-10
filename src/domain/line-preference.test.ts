import { describe, expect, it } from 'vitest'

import { at, home, journey, morningCommute, ride, walk, office } from '@/test/builders'

import { noteworthyAlternative, splitByPreference, usesPreferredLines } from './line-preference'
import { type Trip, planTrip } from './trip'

const plan = (...args: Parameters<typeof journey>): Trip => {
  const trip = planTrip(journey(...args), home, office)
  if (!trip) throw new Error('Expected a trip')
  return trip
}

const commute = (departure: string, options?: Parameters<typeof morningCommute>[1]): Trip => {
  const trip = planTrip(morningCommute(departure, options), home, office)
  if (!trip) throw new Error('Expected a trip')
  return trip
}

/** S1 to Central, then tram 9, which is not among the preferred lines. */
const viaTram = (arrival: string): Trip =>
  plan(
    ride('S1', 'Riverside', '07:05', 'Central', '07:14'),
    walk('Central', 'Central, Bus Station', 1),
    ride('9', 'Central, Bus Station', '07:16', 'Market Square', arrival, { mode: 'tram' }),
  )

describe('usesPreferredLines', () => {
  it('accepts journeys that only use preferred lines', () => {
    expect(usesPreferredLines(morningCommute(), ['S1', 'S2', '20'])).toBe(true)
  })

  it('rejects journeys with another line', () => {
    expect(usesPreferredLines(morningCommute(), ['S1', 'S2'])).toBe(false)
  })

  it('ignores case and surrounding spaces', () => {
    expect(usesPreferredLines(morningCommute(), [' s1 ', '20'])).toBe(true)
  })

  it('accepts every journey without preferences', () => {
    expect(usesPreferredLines(morningCommute(), [])).toBe(true)
  })
})

describe('splitByPreference', () => {
  it('separates preferred trips from alternatives', () => {
    const preferred = commute('07:05')
    const alternative = viaTram('07:20')

    expect(splitByPreference([preferred, alternative], ['S1', 'S2', '20'])).toEqual({
      preferred: [preferred],
      alternatives: [alternative],
    })
  })
})

describe('noteworthyAlternative', () => {
  const now = at('06:40')

  it('suggests an alternative that arrives earlier', () => {
    const faster = viaTram('07:20')

    expect(noteworthyAlternative(commute('07:05'), [faster], now)).toBe(faster)
  })

  it('stays quiet when the preferred trip is at least as fast', () => {
    expect(noteworthyAlternative(commute('07:05'), [viaTram('07:25')], now)).toBeNull()
  })

  it('suggests an alternative when the preferred trip is cancelled', () => {
    const slower = viaTram('07:25')

    expect(noteworthyAlternative(commute('07:05', { cancelled: true }), [slower], now)).toBe(slower)
  })

  it('suggests an alternative when no preferred trip is left', () => {
    const slower = viaTram('07:25')

    expect(noteworthyAlternative(null, [slower], now)).toBe(slower)
  })

  it('ignores alternatives that are not reachable with the reserve', () => {
    expect(noteworthyAlternative(null, [viaTram('07:20')], at('06:56'))).toBeNull()
  })

  it('picks the earliest arrival among several alternatives', () => {
    const later = viaTram('07:22')
    const earlier = viaTram('07:20')

    expect(noteworthyAlternative(null, [later, earlier], now)).toBe(earlier)
  })
})
