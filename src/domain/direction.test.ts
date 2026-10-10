import { describe, expect, it } from 'vitest'

import { home, office } from '@/test/builders'

import { chooseDirection } from './direction'
import type { Route } from './route'
import { minutes } from './time'

// Two stops about 13 km apart, and a place far from both.
const riverside = { latitude: 47.4845, longitude: 7.7314 }
const marketSquare = { latitude: 47.5635, longitude: 7.5996 }
const geneva = { latitude: 46.2102, longitude: 6.1426 }

const route: Route = {
  id: 'commute',
  name: 'Commute',
  places: [
    { ...home, stop: { ...home.stop, coordinates: riverside } },
    { ...office, stop: { ...office.stop, coordinates: marketSquare } },
  ],
  buffer: minutes(3),
  preferredLines: [],
}

const morning = 7 * 60
const afternoon = 16 * 60

describe('chooseDirection', () => {
  it('starts at the place the user is close to', () => {
    expect(chooseDirection(route, { location: riverside, minuteOfDay: afternoon })).toEqual({
      direction: 'outbound',
      basis: 'location',
    })
    expect(chooseDirection(route, { location: marketSquare, minuteOfDay: morning })).toEqual({
      direction: 'return',
      basis: 'location',
    })
  })

  it('falls back to the time of day when the user is far from both places', () => {
    expect(chooseDirection(route, { location: geneva, minuteOfDay: morning })).toEqual({
      direction: 'outbound',
      basis: 'time',
    })
    expect(chooseDirection(route, { location: geneva, minuteOfDay: afternoon })).toEqual({
      direction: 'return',
      basis: 'time',
    })
  })

  it('uses the time of day without a location', () => {
    expect(chooseDirection(route, { minuteOfDay: 11 * 60 + 59 })).toEqual({
      direction: 'outbound',
      basis: 'time',
    })
    expect(chooseDirection(route, { minuteOfDay: 12 * 60 }).direction).toBe('return')
  })

  it('follows the schedule of the day when the location does not decide', () => {
    const schedule = { weekday: 1, arriveBy: 9 * 60, returnFrom: 15 * 60 } as const

    expect(chooseDirection(route, { minuteOfDay: 9 * 60 + 30, schedule })).toEqual({
      direction: 'outbound',
      basis: 'schedule',
    })
    expect(chooseDirection(route, { minuteOfDay: 11 * 60, schedule })).toEqual({
      direction: 'return',
      basis: 'schedule',
    })
    expect(chooseDirection(route, { location: riverside, minuteOfDay: 11 * 60, schedule })).toEqual(
      { direction: 'outbound', basis: 'location' },
    )
  })

  it('respects a custom switch time', () => {
    expect(chooseDirection(route, { minuteOfDay: afternoon, returnFrom: 17 * 60 }).direction).toBe(
      'outbound',
    )
  })

  it('prefers the position of the place over its stop', () => {
    const [first, second] = route.places
    const withHomePosition: Route = {
      ...route,
      places: [{ ...first, coordinates: geneva }, second],
    }

    expect(chooseDirection(withHomePosition, { location: geneva, minuteOfDay: afternoon })).toEqual(
      { direction: 'outbound', basis: 'location' },
    )
  })

  it('falls back to the time of day when a place has no position', () => {
    const withoutPositions: Route = { ...route, places: [home, office] }

    expect(
      chooseDirection(withoutPositions, { location: riverside, minuteOfDay: afternoon }),
    ).toEqual({ direction: 'return', basis: 'time' })
  })
})
