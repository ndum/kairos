import { describe, expect, it } from 'vitest'

import { home, office } from '@/test/builders'

import { chooseDirection } from './direction'
import type { Route } from './route'

const riverside = { latitude: 46.8, longitude: 7.5 }
const marketSquare = { latitude: 46.95, longitude: 7.45 }
const zurich = { latitude: 47.378177, longitude: 8.540192 }

const route: Route = {
  id: 'commute',
  name: 'Commute',
  places: [
    { ...home, stop: { ...home.stop, coordinates: riverside } },
    { ...office, stop: { ...office.stop, coordinates: marketSquare } },
  ],
  preferredLines: [],
}

const morning = 7 * 60
const afternoon = 16 * 60

describe('chooseDirection', () => {
  it('starts at the place the user is close to', () => {
    expect(chooseDirection(route, { location: riverside, minuteOfDay: afternoon })).toBe('outbound')
    expect(chooseDirection(route, { location: marketSquare, minuteOfDay: morning })).toBe('return')
  })

  it('falls back to the time of day when the user is far from both places', () => {
    expect(chooseDirection(route, { location: zurich, minuteOfDay: morning })).toBe('outbound')
    expect(chooseDirection(route, { location: zurich, minuteOfDay: afternoon })).toBe('return')
  })

  it('uses the time of day without a location', () => {
    expect(chooseDirection(route, { minuteOfDay: 11 * 60 + 59 })).toBe('outbound')
    expect(chooseDirection(route, { minuteOfDay: 12 * 60 })).toBe('return')
  })

  it('respects a custom switch time', () => {
    expect(chooseDirection(route, { minuteOfDay: afternoon, returnFrom: 17 * 60 })).toBe('outbound')
  })

  it('prefers the position of the place over its stop', () => {
    const [first, second] = route.places
    const withHomePosition: Route = {
      ...route,
      places: [{ ...first, coordinates: zurich }, second],
    }

    expect(chooseDirection(withHomePosition, { location: zurich, minuteOfDay: afternoon })).toBe(
      'outbound',
    )
  })

  it('falls back to the time of day when a place has no position', () => {
    const withoutPositions: Route = { ...route, places: [home, office] }

    expect(chooseDirection(withoutPositions, { location: riverside, minuteOfDay: afternoon })).toBe(
      'return',
    )
  })
})
