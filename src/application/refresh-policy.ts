import { type Duration, HOUR, type Instant, MINUTE, SECOND } from '@/domain/time'

/** The timetable source refreshes its real-time data every 30 seconds. */
export const LIVE_INTERVAL: Duration = 30 * SECOND
export const RELAXED_INTERVAL: Duration = 2 * MINUTE
export const IDLE_INTERVAL: Duration = 10 * MINUTE

/** Leaving within this window switches to the live interval. */
export const LIVE_WINDOW: Duration = 20 * MINUTE
export const RELAXED_WINDOW: Duration = 2 * HOUR

export const MAX_RETRY_DELAY: Duration = 5 * MINUTE

/** How long to wait before the next refresh, depending on when the user has to leave. */
export function refreshInterval(nextLeaveAt: Instant | null, now: Instant): Duration {
  if (nextLeaveAt === null) return IDLE_INTERVAL
  const remaining = nextLeaveAt - now
  if (remaining <= LIVE_WINDOW) return LIVE_INTERVAL
  return remaining <= RELAXED_WINDOW ? RELAXED_INTERVAL : IDLE_INTERVAL
}

/** Exponential backoff after failed refreshes: 30 s, 1 min, 2 min, 4 min, then 5 min. */
export function retryDelay(failures: number): Duration {
  return Math.min(LIVE_INTERVAL * 2 ** Math.max(0, failures - 1), MAX_RETRY_DELAY)
}
