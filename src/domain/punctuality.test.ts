import { describe, expect, it } from 'vitest'

import { at, morningCommute } from '@/test/builders'

import {
  type DelayRecord,
  RECORD_LIFETIME,
  mergeRecords,
  oftenLate,
  punctualityOf,
  recordsOf,
  withoutJourney,
} from './punctuality'
import { HOUR, minutes } from './time'

const DAY = 24 * HOUR

const s1 = (daysAgo: number, arrivalDelay: number): DelayRecord => ({
  routeId: 'commute',
  line: 'S1',
  mode: 'train',
  departureAt: at('07:05') - daysAgo * DAY,
  departureDelay: 0,
  arrivalDelay: minutes(arrivalDelay),
})

describe('recordsOf', () => {
  it('keeps the delays of every vehicle of the journey', () => {
    expect(recordsOf('commute', morningCommute('07:05', { delay: 2 }))).toEqual([
      {
        routeId: 'commute',
        line: 'S1',
        mode: 'train',
        departureAt: at('07:05'),
        departureDelay: minutes(2),
        arrivalDelay: minutes(2),
      },
      {
        routeId: 'commute',
        line: '20',
        mode: 'bus',
        departureAt: at('07:19'),
        departureDelay: 0,
        arrivalDelay: 0,
      },
    ])
  })
})

describe('mergeRecords', () => {
  it('replaces the record of the same vehicle with the newer one', () => {
    expect(mergeRecords([s1(0, 1)], [s1(0, 4)], at('08:00'))).toEqual([s1(0, 4)])
  })

  it('drops records that are too old and keeps them in order', () => {
    const old = { ...s1(0, 1), departureAt: at('07:05') - RECORD_LIFETIME - DAY }

    expect(mergeRecords([s1(1, 2), old], [s1(2, 3)], at('08:00'))).toEqual([s1(2, 3), s1(1, 2)])
  })
})

describe('withoutJourney', () => {
  it('drops the records of a ride the user was not on', () => {
    const records = recordsOf('commute', morningCommute('07:05'))

    expect(withoutJourney([...records, s1(1, 2)], 'commute', morningCommute('07:05'))).toEqual([
      s1(1, 2),
    ])
  })
})

describe('punctualityOf', () => {
  it('sums up the last two weeks per line of the route', () => {
    const records = [s1(1, 0), s1(2, 4), s1(3, 2), s1(20, 9), { ...s1(1, 9), routeId: 'gym' }]

    expect(punctualityOf(records, 'commute', at('08:00'))).toEqual([
      { line: 'S1', mode: 'train', count: 3, averageDelay: minutes(2), late: 1 },
    ])
  })

  it('leaves out lines with too few rides', () => {
    expect(punctualityOf([s1(1, 5), s1(2, 5)], 'commute', at('08:00'))).toEqual([])
  })
})

describe('oftenLate', () => {
  it('warns once every third ride arrives late', () => {
    const line = { line: 'S1', mode: 'train', count: 6, averageDelay: 0 } as const

    expect(oftenLate({ ...line, late: 2 })).toBe(true)
    expect(oftenLate({ ...line, late: 1 })).toBe(false)
  })
})
