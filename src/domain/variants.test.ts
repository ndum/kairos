import { describe, expect, it } from 'vitest'

import { busLine, journey, morningCommute, ride, trainLine, walk } from '@/test/builders'

import { minutes } from './time'
import {
  type Variant,
  linesOfJourney,
  linesOfVariant,
  mainVariants,
  prefersVariant,
  variantsOf,
} from './variants'

const viaTram = (departure: string, arrival: string) =>
  journey(
    ride('S1', 'Riverside', departure, 'Central', '07:30'),
    ride('9', 'Central', '07:33', 'Market Square', arrival, { mode: 'tram' }),
  )

describe('variantsOf', () => {
  it('groups journeys by their lines and puts the fastest variant first', () => {
    const variants = variantsOf([
      morningCommute('07:05'),
      viaTram('07:21', '07:40'),
      morningCommute('07:20'),
      morningCommute('07:35'),
    ])

    expect(variants).toEqual([
      { lines: [trainLine('S1'), busLine('20')], journeys: 3, duration: minutes(18) },
      {
        lines: [trainLine('S1'), { name: '9', mode: 'tram' }],
        journeys: 1,
        duration: minutes(19),
      },
    ])
  })

  it('measures from the first departure to the last arrival with real-time data', () => {
    const late = journey(
      walk('Riverside', 'Riverside, Pier', 2),
      ride('S1', 'Riverside, Pier', '07:05', 'Central', '07:14', { delay: 2, arrivalDelay: 5 }),
    )

    expect(variantsOf([late])[0]?.duration).toBe(minutes(12))
  })

  it('leaves out journeys without vehicles and cancelled ones', () => {
    const cancelled = journey(
      ride('S1', 'Riverside', '07:05', 'Central', '07:14', { cancelled: true }),
    )

    expect(variantsOf([journey(walk('Riverside', 'Central', 20)), cancelled])).toEqual([])
  })
})

describe('mainVariants', () => {
  const variant = (line: string, journeys: number, duration: number): Variant => ({
    lines: [trainLine(line)],
    journeys,
    duration: minutes(duration),
  })

  it('keeps the fastest variant and adds the most frequent ones', () => {
    const variants = [
      variant('IR 37', 1, 23),
      variant('IR 27', 1, 24),
      variant('S32', 1, 26),
      variant('S3', 3, 28),
    ]

    expect(mainVariants(variants, 2)).toEqual([variant('IR 37', 1, 23), variant('S3', 3, 28)])
  })

  it('offers nothing without variants', () => {
    expect(mainVariants([], 4)).toEqual([])
  })
})

describe('linesOfJourney', () => {
  it('lists the lines a journey rides', () => {
    expect(linesOfJourney(morningCommute())).toEqual([trainLine('S1'), busLine('20')])
  })
})

describe('linesOfVariant', () => {
  it('lists every line once', () => {
    const variant = { lines: [trainLine('S1'), busLine('20'), trainLine('s1')] }

    expect(linesOfVariant(variant)).toEqual([trainLine('S1'), busLine('20')])
  })
})

describe('prefersVariant', () => {
  const variant = { lines: [trainLine('S1'), busLine('20')] }

  it('matches the same lines in any order and spelling', () => {
    expect(prefersVariant([busLine('20'), trainLine('s1')], variant)).toBe(true)
  })

  it('does not match other lines or no lines at all', () => {
    expect(prefersVariant([trainLine('S1')], variant)).toBe(false)
    expect(prefersVariant([], variant)).toBe(false)
  })
})
