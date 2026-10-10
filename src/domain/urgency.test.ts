import { describe, expect, it } from 'vitest'

import { at } from '@/test/builders'

import { type Urgency, isReachableWithReserve, urgencyOf } from './urgency'

describe('urgencyOf', () => {
  const trip = { leaveAt: at('06:54'), latestLeaveAt: at('06:57') }

  it.each<[string, Urgency]>([
    ['06:40', 'relaxed'],
    ['06:48', 'relaxed'],
    ['06:49', 'soon'],
    ['06:54', 'soon'],
    ['06:55', 'tight'],
    ['06:57', 'tight'],
    ['06:58', 'missed'],
  ])('at %s the trip is %s', (time, urgency) => {
    expect(urgencyOf(trip, at(time))).toBe(urgency)
  })
})

describe('isReachableWithReserve', () => {
  it.each<[Urgency, boolean]>([
    ['relaxed', true],
    ['soon', true],
    ['tight', false],
    ['missed', false],
  ])('is %s for %s', (urgency, expected) => {
    expect(isReachableWithReserve(urgency)).toBe(expected)
  })
})
