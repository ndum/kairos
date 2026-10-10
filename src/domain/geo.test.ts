import { describe, expect, it } from 'vitest'

import { distanceInMeters } from './geo'

const basel = { latitude: 47.547413, longitude: 7.58956 }
const liestal = { latitude: 47.484461, longitude: 7.731368 }

describe('distanceInMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceInMeters(basel, basel)).toBe(0)
  })

  it('measures the distance between the stations of Basel and Liestal', () => {
    expect(distanceInMeters(basel, liestal)).toBeCloseTo(12744, -2)
  })

  it('is symmetric', () => {
    expect(distanceInMeters(basel, liestal)).toBe(distanceInMeters(liestal, basel))
  })
})
