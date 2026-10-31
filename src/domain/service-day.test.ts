import { describe, expect, it } from 'vitest'

import { at } from '@/test/builders'

import { serviceDayOf } from './service-day'

describe('serviceDayOf', () => {
  it('counts the hours after midnight to the evening before', () => {
    expect(serviceDayOf(at('03:59'))).toBe('2026-10-11')
    expect(serviceDayOf(at('04:00'))).toBe('2026-10-12')
  })
})
