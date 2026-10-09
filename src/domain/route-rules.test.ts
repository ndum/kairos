import { describe, expect, it } from 'vitest'

import { busLine, home, office, trainLine } from '@/test/builders'

import type { Route } from './route'
import {
  NAME_MAX_LENGTH,
  hasDistinctStops,
  isValidName,
  isValidPlace,
  isValidRoute,
  normalizeLines,
} from './route-rules'
import { minutes } from './time'

const route: Route = { id: 'commute', name: 'Commute', places: [home, office], preferredLines: [] }

describe('isValidName', () => {
  it('accepts names with up to the maximum length', () => {
    expect(isValidName('Home')).toBe(true)
    expect(isValidName('x'.repeat(NAME_MAX_LENGTH))).toBe(true)
  })

  it('rejects blank and overly long names', () => {
    expect(isValidName('')).toBe(false)
    expect(isValidName('   ')).toBe(false)
    expect(isValidName('x'.repeat(NAME_MAX_LENGTH + 1))).toBe(false)
  })

  it('ignores surrounding spaces', () => {
    expect(isValidName(`  ${'x'.repeat(NAME_MAX_LENGTH)}  `)).toBe(true)
  })
})

describe('isValidPlace', () => {
  it('accepts a named place with a stop and walking time and reserve in range', () => {
    expect(isValidPlace(home)).toBe(true)
    expect(isValidPlace({ ...home, walk: 0, reserve: 0 })).toBe(true)
    expect(isValidPlace({ ...home, walk: minutes(60), reserve: minutes(30) })).toBe(true)
  })

  it('rejects a place without a name or a stop', () => {
    expect(isValidPlace({ ...home, name: ' ' })).toBe(false)
    expect(isValidPlace({ ...home, stop: { id: '', name: 'Riverside' } })).toBe(false)
  })

  it('rejects walking times and reserves out of range', () => {
    expect(isValidPlace({ ...home, walk: minutes(-1) })).toBe(false)
    expect(isValidPlace({ ...home, walk: minutes(61) })).toBe(false)
    expect(isValidPlace({ ...home, reserve: minutes(31) })).toBe(false)
    expect(isValidPlace({ ...home, reserve: Number.NaN })).toBe(false)
  })
})

describe('hasDistinctStops', () => {
  it('requires a different stop at each end', () => {
    expect(hasDistinctStops(route)).toBe(true)
    expect(hasDistinctStops({ ...route, places: [home, { ...office, stop: home.stop }] })).toBe(
      false,
    )
  })
})

describe('isValidRoute', () => {
  it('accepts a named route between two valid places', () => {
    expect(isValidRoute(route)).toBe(true)
  })

  it('rejects a route without a name or with an invalid place', () => {
    expect(isValidRoute({ ...route, name: '' })).toBe(false)
    expect(isValidRoute({ ...route, places: [home, { ...office, name: '' }] })).toBe(false)
  })

  it('rejects a route that starts and ends at the same stop', () => {
    expect(isValidRoute({ ...route, places: [home, home] })).toBe(false)
  })
})

describe('normalizeLines', () => {
  it('trims names and drops blanks and duplicates that differ only in case', () => {
    const lines = [trainLine(' S1'), trainLine('s1'), busLine('20 '), busLine(''), trainLine('S2')]

    expect(normalizeLines(lines)).toEqual([trainLine('S1'), busLine('20'), trainLine('S2')])
  })
})
