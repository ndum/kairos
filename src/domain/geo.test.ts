import { describe, expect, it } from 'vitest'

import { distanceInMeters } from './geo'

const bern = { latitude: 46.948831, longitude: 7.439129 }
const thun = { latitude: 46.754852, longitude: 7.629607 }

describe('distanceInMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceInMeters(bern, bern)).toBe(0)
  })

  it('measures the distance between the stations of Bern and Thun', () => {
    expect(distanceInMeters(bern, thun)).toBeCloseTo(25982, -2)
  })

  it('is symmetric', () => {
    expect(distanceInMeters(bern, thun)).toBe(distanceInMeters(thun, bern))
  })
})
