import { describe, expect, it } from 'vitest'

import { commute, ends, home, office } from '@/test/builders'

import { type Route, endpoints, oppositeDirection, positionOf } from './route'
import { minutes } from './time'

const route: Route = {
  id: 'commute',
  name: 'Commute',
  places: [home, office],
  buffer: minutes(3),
  preferredLines: [],
}

describe('endpoints', () => {
  it('travels from the first to the second place outbound', () => {
    expect(endpoints(route, 'outbound')).toEqual(commute)
  })

  it('travels back on the return', () => {
    expect(endpoints(route, 'return')).toEqual(ends(office, home))
  })

  it('keeps the buffer of the route in both directions', () => {
    const relaxed = { ...route, buffer: minutes(10) }

    expect(endpoints(relaxed, 'outbound').buffer).toBe(minutes(10))
    expect(endpoints(relaxed, 'return').buffer).toBe(minutes(10))
  })
})

describe('oppositeDirection', () => {
  it('swaps the direction', () => {
    expect(oppositeDirection('outbound')).toBe('return')
    expect(oppositeDirection('return')).toBe('outbound')
  })
})

describe('positionOf', () => {
  const stopPosition = { latitude: 47.4845, longitude: 7.7314 }
  const placePosition = { latitude: 47.4861, longitude: 7.7302 }

  it('prefers the position of the place', () => {
    const place = {
      ...home,
      coordinates: placePosition,
      stop: { ...home.stop, coordinates: stopPosition },
    }

    expect(positionOf(place)).toBe(placePosition)
  })

  it('falls back to the stop', () => {
    expect(positionOf({ ...home, stop: { ...home.stop, coordinates: stopPosition } })).toBe(
      stopPosition,
    )
  })
})
