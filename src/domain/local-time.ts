import type { Weekday } from './schedule'
import { HOUR, type Instant, MINUTE } from './time'

/** Kairos works with Swiss timetables, so local time is always Swiss time. */
export const TIME_ZONE = 'Europe/Zurich'

export interface LocalDateTime {
  /** Calendar date as YYYY-MM-DD. */
  readonly date: string
  /** Time of day as HH:MM, 24-hour clock. */
  readonly time: string
  /** Minutes since local midnight. */
  readonly minuteOfDay: number
}

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function toLocal(instant: Instant): LocalDateTime {
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  ) as Partial<Record<Intl.DateTimeFormatPartTypes, string>>
  const { year = '', month = '', day = '', hour = '00', minute = '00' } = parts

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    minuteOfDay: Number(hour) * 60 + Number(minute),
  }
}

/** Day of the week in Swiss time, as in ISO 8601: 1 is Monday, 7 is Sunday. */
export function weekdayOf(instant: Instant): Weekday {
  const [year = 0, month = 1, day = 1] = toLocal(instant).date.split('-').map(Number)
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return (sundayFirst === 0 ? 7 : sundayFirst) as Weekday
}

/** Offset of Swiss time from UTC at an instant, in milliseconds. */
function offsetAt(instant: Instant): number {
  const { date, time } = toLocal(instant)
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  const flooredToMinute = Math.floor(instant / MINUTE) * MINUTE
  return Date.UTC(year, month - 1, day, hour, minute) - flooredToMinute
}

/**
 * The instant of a Swiss date and time, as entered in a form. Swiss time is at most two hours
 * ahead of UTC, so the offset two hours before the wall time applies. When the clocks go back,
 * this takes the first of the repeated hours; a time skipped when they go forward moves on by
 * the missing hour.
 */
export function fromLocal(date: string, time: string): Instant {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  const wallClock = Date.UTC(year, month - 1, day, hour, minute)
  return wallClock - offsetAt(wallClock - 2 * HOUR)
}
