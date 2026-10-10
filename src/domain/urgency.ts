import { type Duration, type Instant, minutes } from './time'
import type { Trip } from './trip'

/**
 * How pressing it is to leave for a trip:
 * - relaxed: more than five minutes until the leave time
 * - soon: five minutes or less
 * - tight: only reachable without the buffer
 * - missed: no longer reachable
 */
export type Urgency = 'relaxed' | 'soon' | 'tight' | 'missed'

export const SOON_THRESHOLD: Duration = minutes(5)

export function urgencyOf(trip: Pick<Trip, 'leaveAt' | 'latestLeaveAt'>, now: Instant): Urgency {
  if (now > trip.latestLeaveAt) return 'missed'
  if (now > trip.leaveAt) return 'tight'
  return trip.leaveAt - now <= SOON_THRESHOLD ? 'soon' : 'relaxed'
}

export const isReachableWithBuffer = (urgency: Urgency): boolean =>
  urgency === 'relaxed' || urgency === 'soon'
