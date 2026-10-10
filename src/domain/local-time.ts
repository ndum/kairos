import type { Instant } from './time'

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
