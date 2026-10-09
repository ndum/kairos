import { describe, expect, it } from 'vitest'

import { fromLocal, toLocal } from './local-time'

describe('toLocal', () => {
  it('converts to Swiss summer time', () => {
    expect(toLocal(Date.parse('2026-10-12T05:04:00Z'))).toEqual({
      date: '2026-10-12',
      time: '07:04',
      minuteOfDay: 7 * 60 + 4,
    })
  })

  it('converts to Swiss winter time', () => {
    expect(toLocal(Date.parse('2026-12-01T23:30:00Z'))).toEqual({
      date: '2026-12-02',
      time: '00:30',
      minuteOfDay: 30,
    })
  })
})

describe('fromLocal', () => {
  it('reads Swiss summer and winter time', () => {
    expect(fromLocal('2026-10-12', '07:04')).toBe(Date.parse('2026-10-12T05:04:00Z'))
    expect(fromLocal('2026-12-02', '00:30')).toBe(Date.parse('2026-12-01T23:30:00Z'))
  })

  it('takes the first of the two hours when the clocks go back', () => {
    expect(fromLocal('2026-10-25', '02:30')).toBe(Date.parse('2026-10-25T00:30:00Z'))
  })

  it('moves a time that is skipped when the clocks go forward to the hour after', () => {
    expect(fromLocal('2026-03-29', '02:30')).toBe(Date.parse('2026-03-29T01:30:00Z'))
  })

  it('round-trips with toLocal', () => {
    const instant = Date.parse('2026-07-01T16:45:00Z')
    const { date, time } = toLocal(instant)

    expect(fromLocal(date, time)).toBe(instant)
  })
})
