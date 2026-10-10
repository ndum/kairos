import type { CalendarEvent, CalendarFile, CalendarWriter } from '@/application/ports/calendar'
import type { Clock } from '@/application/ports/clock'
import { toLocal } from '@/domain/local-time'
import type { Instant } from '@/domain/time'

/** Content lines longer than this many bytes continue on the next line (RFC 5545, 3.1). */
const LINE_BYTES = 75
const encoder = new TextEncoder()

/** Writes iCalendar files (RFC 5545), which every common calendar app imports. */
export class ICalendarWriter implements CalendarWriter {
  readonly #clock: Clock

  constructor(clock: Clock) {
    this.#clock = clock
  }

  write(event: CalendarEvent): CalendarFile {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kairos//Kairos//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${text(event.id)}`,
      `DTSTAMP:${utc(this.#clock.now())}`,
      `DTSTART:${utc(event.start)}`,
      `DTEND:${utc(event.end)}`,
      `SUMMARY:${text(event.title)}`,
      `DESCRIPTION:${text(event.description)}`,
      ...(event.location === undefined ? [] : [`LOCATION:${text(event.location)}`]),
      ...(event.reminder === undefined
        ? []
        : [
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            `DESCRIPTION:${text(event.reminder)}`,
            'TRIGGER:PT0S',
            'END:VALARM',
          ]),
      'END:VEVENT',
      'END:VCALENDAR',
    ]
    const { date, time } = toLocal(event.start)
    return {
      name: `kairos-${date}-${time.replace(':', '')}.ics`,
      type: 'text/calendar;charset=utf-8',
      content: `${lines.map(fold).join('\r\n')}\r\n`,
    }
  }
}

/** A time in UTC, for example 20261019T045400Z. */
function utc(instant: Instant): string {
  return new Date(instant)
    .toISOString()
    .replace(/\.\d{3}/, '')
    .replaceAll(/[-:]/g, '')
}

/** Escapes the characters that separate values in iCalendar text. */
function text(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(/\r?\n/g, '\\n')
}

/** Breaks a long line into lines of at most 75 bytes, without splitting a character. */
function fold(line: string): string {
  const parts: string[] = []
  let part = ''
  let bytes = 0
  for (const character of line) {
    const size = encoder.encode(character).length
    // Continuation lines start with a space, which counts towards their length.
    const limit = parts.length === 0 ? LINE_BYTES : LINE_BYTES - 1
    if (bytes + size > limit) {
      parts.push(part)
      part = ''
      bytes = 0
    }
    part += character
    bytes += size
  }
  parts.push(part)
  return parts.join('\r\n ')
}
