import { describe, expect, it } from 'vitest'

import { at, commute, journey, morningCommute, ride, walk } from '@/test/builders'

import {
  combineLineUsage,
  linesUsedBy,
  noteworthyAlternative,
  splitByPreference,
  usesPreferredLines,
} from './line-preference'
import { type Trip, planTrip } from './trip'

const plan = (...args: Parameters<typeof journey>): Trip => {
  const trip = planTrip(journey(...args), commute)
  if (!trip) throw new Error('Expected a trip')
  return trip
}

const tripAt = (departure: string, options?: Parameters<typeof morningCommute>[1]): Trip => {
  const trip = planTrip(morningCommute(departure, options), commute)
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
    const preferred = tripAt('07:05')
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

    expect(noteworthyAlternative(tripAt('07:05'), [faster], now)).toBe(faster)
  })

  it('stays quiet when the preferred trip is at least as fast', () => {
    expect(noteworthyAlternative(tripAt('07:05'), [viaTram('07:25')], now)).toBeNull()
  })

  it('suggests an alternative when the preferred trip is cancelled', () => {
    const slower = viaTram('07:25')

    expect(noteworthyAlternative(tripAt('07:05', { cancelled: true }), [slower], now)).toBe(slower)
  })

  it('suggests an alternative when no preferred trip is left', () => {
    const slower = viaTram('07:25')

    expect(noteworthyAlternative(null, [slower], now)).toBe(slower)
  })

  it('ignores alternatives that are not reachable with the buffer', () => {
    expect(noteworthyAlternative(null, [viaTram('07:20')], at('06:56'))).toBeNull()
  })

  it('picks the earliest arrival among several alternatives', () => {
    const later = viaTram('07:22')
    const earlier = viaTram('07:20')

    expect(noteworthyAlternative(null, [later, earlier], now)).toBe(earlier)
  })
})

describe('linesUsedBy', () => {
  it('lists each line once, in the order of the trip and by frequency', () => {
    const journeys = [
      morningCommute('07:05'),
      journey(
        ride('S2', 'Riverside', '07:12', 'Central', '07:21'),
        walk('Central', 'Central, Bus Station', 4),
        ride('20', 'Central, Bus Station', '07:26', 'Market Square', '07:30', { mode: 'bus' }),
      ),
      morningCommute('07:35'),
      viaTram('07:24').journey,
    ]

    expect(linesUsedBy(journeys)).toEqual([
      { name: 'S1', mode: 'train', journeys: 3 },
      { name: 'S2', mode: 'train', journeys: 1 },
      { name: '20', mode: 'bus', journeys: 3 },
      { name: '9', mode: 'tram', journeys: 1 },
    ])
  })

  it('counts a line once per journey and ignores differences in case', () => {
    const journeys = [
      journey(
        ride('s1', 'Riverside', '07:05', 'Central', '07:14'),
        ride('S1', 'Central', '07:20', 'Market Square', '07:30'),
      ),
    ]

    expect(linesUsedBy(journeys)).toEqual([{ name: 's1', mode: 'train', journeys: 1 }])
  })

  it('sorts lines with the same position and frequency by name', () => {
    const journeys = [
      journey(ride('S11', 'Riverside', '07:05', 'Market Square', '07:20')),
      journey(ride('S2', 'Riverside', '07:10', 'Market Square', '07:25')),
    ]

    expect(linesUsedBy(journeys).map((line) => line.name)).toEqual(['S2', 'S11'])
  })
})

describe('combineLineUsage', () => {
  it('keeps the order of the first list, sums the journeys and appends the other lines', () => {
    const outbound = [
      { name: 'S1', mode: 'train', journeys: 3 },
      { name: '20', mode: 'bus', journeys: 3 },
    ] as const
    const back = [
      { name: '20', mode: 'bus', journeys: 2 },
      { name: '9', mode: 'tram', journeys: 1 },
      { name: 's1', mode: 'train', journeys: 2 },
    ] as const

    expect(combineLineUsage(outbound, back)).toEqual([
      { name: 'S1', mode: 'train', journeys: 5 },
      { name: '20', mode: 'bus', journeys: 5 },
      { name: '9', mode: 'tram', journeys: 1 },
    ])
  })
})
