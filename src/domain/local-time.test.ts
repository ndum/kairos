import { describe, expect, it } from 'vitest'

import { toLocal } from './local-time'

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
