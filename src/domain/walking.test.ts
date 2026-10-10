import { describe, expect, it } from 'vitest'

import { minutes } from './time'
import { estimateWalk } from './walking'

describe('estimateWalk', () => {
  it.each([
    [200, 4],
    [500, 9],
    [1000, 17],
  ])('takes %i meters as the crow flies as %i minutes on foot', (meters, expected) => {
    expect(estimateWalk(meters)).toBe(minutes(expected))
  })

  it('takes at least one minute', () => {
    expect(estimateWalk(0)).toBe(minutes(1))
    expect(estimateWalk(-20)).toBe(minutes(1))
  })

  it('never exceeds the longest walk a place may have', () => {
    expect(estimateWalk(10_000)).toBe(minutes(60))
  })
})
