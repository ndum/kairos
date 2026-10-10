import { type Duration, type Instant, MINUTE } from '@/domain/time'

/** Beyond this, a countdown is harder to read than the clock time. */
export const CLOCK_THRESHOLD: Duration = 90 * MINUTE

/** The meter fills up over this time before leaving. */
export const METER_WINDOW: Duration = 20 * MINUTE

export type Countdown =
  | { readonly kind: 'minutes'; readonly minutes: number }
  | { readonly kind: 'now' }
  | { readonly kind: 'at'; readonly at: Instant }

/**
 * Time until leaving as shown on the board. Minutes are rounded down, so the countdown never
 * promises more time than there is.
 */
export function countdownTo(leaveAt: Instant, now: Instant): Countdown {
  const remaining = leaveAt - now
  if (remaining > CLOCK_THRESHOLD) return { kind: 'at', at: leaveAt }
  const minutes = Math.floor(remaining / MINUTE)
  return minutes >= 1 ? { kind: 'minutes', minutes } : { kind: 'now' }
}

/** Share of the meter window that has passed, from 0 to 1. */
export function urgencyProgress(leaveAt: Instant, now: Instant): number {
  return Math.min(1, Math.max(0, 1 - (leaveAt - now) / METER_WINDOW))
}
