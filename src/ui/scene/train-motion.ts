import { type Duration, type Instant, MINUTE, SECOND } from '@/domain/time'

// Positions in the coordinate system of the panorama, which is 2400 units wide.

/** Where the front of the train stops, next to the station sign. */
export const STATION_X = 1262
export const TRAIN_LENGTH = 478
export const OFFSTAGE_LEFT = -600
export const OFFSTAGE_RIGHT = 3000

const APPROACH: Duration = 9 * MINUTE
const DWELL: Duration = 40 * SECOND
const DEPARTURE: Duration = 140 * SECOND

const easeOut = (progress: number): number => 1 - (1 - progress) ** 3
const easeIn = (progress: number): number => progress ** 2

/**
 * Horizontal offset of the train: it rolls in during the last minutes before its departure,
 * waits at the platform and pulls out afterwards.
 */
export function trainOffset(departureAt: Instant | null, now: Instant): number {
  if (departureAt === null) return OFFSTAGE_LEFT
  const parked = STATION_X - TRAIN_LENGTH
  const untilDeparture = departureAt - now

  if (untilDeparture > APPROACH) return OFFSTAGE_LEFT
  if (untilDeparture > DWELL) {
    const progress = 1 - (untilDeparture - DWELL) / (APPROACH - DWELL)
    return OFFSTAGE_LEFT + (parked - OFFSTAGE_LEFT) * easeOut(progress)
  }
  if (untilDeparture > 0) return parked

  const progress = Math.min(1, -untilDeparture / DEPARTURE)
  return parked + (OFFSTAGE_RIGHT - parked) * easeIn(progress)
}

/** True while the train rolls in or pulls out, the only times the scene needs frame updates. */
export function isTrainMoving(departureAt: Instant | null, now: Instant): boolean {
  if (departureAt === null) return false
  const untilDeparture = departureAt - now
  return (
    (untilDeparture <= APPROACH && untilDeparture > DWELL) ||
    (untilDeparture <= 0 && untilDeparture > -DEPARTURE)
  )
}
