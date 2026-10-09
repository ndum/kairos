import { describe, expect, it } from 'vitest'

import { MINUTE, SECOND } from '@/domain/time'
import { at } from '@/test/builders'

import { countdownTo, urgencyProgress } from './countdown'

const leaveAt = at('07:30')

describe('countdownTo', () => {
  it('counts whole minutes, rounded down to stay on the safe side', () => {
    expect(countdownTo(leaveAt, leaveAt - 7 * MINUTE)).toEqual({ kind: 'minutes', minutes: 7 })
    expect(countdownTo(leaveAt, leaveAt - 7 * MINUTE + SECOND)).toEqual({
      kind: 'minutes',
      minutes: 6,
    })
    expect(countdownTo(leaveAt, leaveAt - 90 * MINUTE)).toEqual({ kind: 'minutes', minutes: 90 })
  })

  it('asks to leave now in the last minute', () => {
    expect(countdownTo(leaveAt, leaveAt - 59 * SECOND)).toEqual({ kind: 'now' })
    expect(countdownTo(leaveAt, leaveAt + 30 * SECOND)).toEqual({ kind: 'now' })
  })

  it('shows the clock time when leaving is more than 90 minutes away', () => {
    expect(countdownTo(leaveAt, leaveAt - 90 * MINUTE - SECOND)).toEqual({
      kind: 'at',
      at: leaveAt,
    })
  })
})

describe('urgencyProgress', () => {
  it('fills up over the last twenty minutes before leaving', () => {
    expect(urgencyProgress(leaveAt, leaveAt - 30 * MINUTE)).toBe(0)
    expect(urgencyProgress(leaveAt, leaveAt - 10 * MINUTE)).toBe(0.5)
    expect(urgencyProgress(leaveAt, leaveAt)).toBe(1)
    expect(urgencyProgress(leaveAt, leaveAt + MINUTE)).toBe(1)
  })
})
