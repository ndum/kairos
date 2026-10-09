import { describe, expect, it } from 'vitest'

import { HOUR, MINUTE, SECOND } from '@/domain/time'
import { at } from '@/test/builders'

import { refreshInterval, retryDelay } from './refresh-policy'

describe('refreshInterval', () => {
  const now = at('06:40')

  it('refreshes every 30 seconds when leaving within 20 minutes', () => {
    expect(refreshInterval(now + 20 * MINUTE, now)).toBe(30 * SECOND)
    expect(refreshInterval(now - MINUTE, now)).toBe(30 * SECOND)
  })

  it('refreshes every two minutes when leaving later', () => {
    expect(refreshInterval(now + 21 * MINUTE, now)).toBe(2 * MINUTE)
    expect(refreshInterval(now + 2 * HOUR, now)).toBe(2 * MINUTE)
  })

  it('refreshes rarely when nothing leaves soon', () => {
    expect(refreshInterval(now + 3 * HOUR, now)).toBe(10 * MINUTE)
    expect(refreshInterval(null, now)).toBe(10 * MINUTE)
  })
})

describe('retryDelay', () => {
  it.each([
    [1, 30 * SECOND],
    [2, MINUTE],
    [3, 2 * MINUTE],
    [4, 4 * MINUTE],
    [5, 5 * MINUTE],
    [12, 5 * MINUTE],
  ])('waits after %i failures for %i ms', (failures, delay) => {
    expect(retryDelay(failures)).toBe(delay)
  })
})
