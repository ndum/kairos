import { describe, expect, it } from 'vitest'

import { home, office } from '@/test/builders'

import { type Route, endpoints, oppositeDirection, positionOf } from './route'

const route: Route = { id: 'commute', name: 'Commute', places: [home, office], preferredLines: [] }

describe('endpoints', () => {
  it('travels from the first to the second place outbound', () => {
    expect(endpoints(route, 'outbound')).toEqual({ origin: home, destination: office })
  })

  it('travels back on the return', () => {
    expect(endpoints(route, 'return')).toEqual({ origin: office, destination: home })
  })
})

describe('oppositeDirection', () => {
  it('swaps the direction', () => {
    expect(oppositeDirection('outbound')).toBe('return')
    expect(oppositeDirection('return')).toBe('outbound')
  })
})

describe('positionOf', () => {
  const stopPosition = { latitude: 46.8, longitude: 7.5 }
  const placePosition = { latitude: 46.802, longitude: 7.503 }

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
