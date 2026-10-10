import { fromLocal, toLocal, weekdayOf } from './local-time'
import type { Direction } from './route'
import { HOUR, type Instant, MINUTE } from './time'

/** Days of the week as in ISO 8601: 1 is Monday, 7 is Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7]

export const MINUTES_PER_DAY = 24 * 60

/** The fixed times of one weekday, in minutes since midnight. */
export interface ScheduleDay {
  readonly weekday: Weekday
  /** By then the user wants to be at the destination. */
  readonly arriveBy: number | null
  /** From then on the user heads back to the origin. */
  readonly returnFrom: number | null
}

/** Weekdays with fixed times, for example school or work. Other days keep the usual board. */
export type Schedule = readonly ScheduleDay[]

/** The outbound direction stays this long after the arrival time, for a user running late. */
export const OUTBOUND_GRACE = HOUR

const isMinuteOfDay = (value: number | null): boolean =>
  value === null || (Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY)

/** Every day once at most, with at least one time, and the way back after the arrival. */
export function isValidSchedule(schedule: Schedule): boolean {
  const weekdays = new Set(schedule.map((day) => day.weekday))
  return (
    weekdays.size === schedule.length &&
    schedule.every(
      (day) =>
        WEEKDAYS.includes(day.weekday) &&
        isMinuteOfDay(day.arriveBy) &&
        isMinuteOfDay(day.returnFrom) &&
        (day.arriveBy !== null || day.returnFrom !== null) &&
        !returnsBeforeArrival(day),
    )
  )
}

/** A way back that starts before the arrival, which a schedule cannot mean. */
export const returnsBeforeArrival = (day: Pick<ScheduleDay, 'arriveBy' | 'returnFrom'>): boolean =>
  day.arriveBy !== null && day.returnFrom !== null && day.returnFrom < day.arriveBy

/** The times of the weekday an instant falls on, in Swiss time. */
export function scheduleDayAt(schedule: Schedule | undefined, now: Instant): ScheduleDay | null {
  const weekday = weekdayOf(now)
  return schedule?.find((day) => day.weekday === weekday) ?? null
}

/**
 * The direction a day of the schedule suggests: the way there until a while after the arrival
 * time, then the way back. A day with only a time for the way back decides from that time on.
 */
export function directionBySchedule(
  day: ScheduleDay | null,
  minuteOfDay: number,
): Direction | null {
  if (!day) return null
  if (day.arriveBy !== null) {
    return minuteOfDay < day.arriveBy + OUTBOUND_GRACE / MINUTE ? 'outbound' : 'return'
  }
  return day.returnFrom !== null && minuteOfDay >= day.returnFrom ? 'return' : null
}

/** What the schedule asks of one direction today. */
export type ScheduleTarget =
  /** The trip has to arrive at the destination by then. */
  | { readonly kind: 'arrive'; readonly by: Instant }
  /** The trip leaves the origin not before then. */
  | { readonly kind: 'return'; readonly from: Instant }

/**
 * The time the schedule sets for a direction today: the way there has to arrive in time, the
 * way back starts once the day there is over. A time that has passed sets nothing any more.
 */
export function scheduleTarget(
  schedule: Schedule | undefined,
  direction: Direction,
  now: Instant,
): ScheduleTarget | null {
  const day = scheduleDayAt(schedule, now)
  const minute = direction === 'outbound' ? day?.arriveBy : day?.returnFrom
  if (minute === null || minute === undefined) return null

  const at = fromLocal(toLocal(now).date, clockTime(minute))
  if (now >= at) return null
  return direction === 'outbound' ? { kind: 'arrive', by: at } : { kind: 'return', from: at }
}

/** Minutes since midnight as HH:MM. */
export function clockTime(minuteOfDay: number): string {
  const hours = String(Math.floor(minuteOfDay / 60)).padStart(2, '0')
  const minutes = String(minuteOfDay % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}
