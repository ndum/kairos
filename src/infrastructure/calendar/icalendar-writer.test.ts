import { describe, expect, it } from 'vitest'

import type { CalendarEvent } from '@/application/ports/calendar'
import { FakeClock } from '@/test/fakes'

import { ICalendarWriter } from './icalendar-writer'

const trip: CalendarEvent = {
  id: 'IR37-1792385100000@kairos',
  title: 'Home → Work',
  description: '07:05 IR 37 from Liestal, platform 4\nArrives at Work at 07:33',
  location: 'Liestal',
  start: Date.parse('2026-10-19T06:54:00+02:00'),
  end: Date.parse('2026-10-19T07:33:00+02:00'),
  reminder: 'Leave for Work',
}

const writer = new ICalendarWriter(new FakeClock(Date.parse('2026-10-10T18:00:00Z')))

const linesOf = (content: string) => content.split('\r\n')

describe('ICalendarWriter', () => {
  it('writes the trip as an appointment in UTC with a reminder at the start', () => {
    const file = writer.write(trip)

    expect(file).toMatchObject({
      name: 'kairos-2026-10-19-0654.ics',
      type: 'text/calendar;charset=utf-8',
    })
    expect(linesOf(file.content)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kairos//Kairos//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:IR37-1792385100000@kairos',
      'DTSTAMP:20261010T180000Z',
      'DTSTART:20261019T045400Z',
      'DTEND:20261019T053300Z',
      'SUMMARY:Home → Work',
      'DESCRIPTION:07:05 IR 37 from Liestal\\, platform 4\\nArrives at Work at 07:33',
      'LOCATION:Liestal',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Leave for Work',
      'TRIGGER:PT0S',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ])
  })

  it('leaves out the place and the reminder when there are none', () => {
    const { location: _location, reminder: _reminder, ...plain } = trip
    const lines = linesOf(writer.write(plain).content)

    expect(lines.some((line) => line.startsWith('LOCATION'))).toBe(false)
    expect(lines).not.toContain('BEGIN:VALARM')
  })

  it('escapes the characters that separate values', () => {
    const { content } = writer.write({ ...trip, title: 'A;B,C\\D' })

    expect(linesOf(content)).toContain('SUMMARY:A\\;B\\,C\\\\D')
  })

  it('folds long lines at 75 bytes without splitting a character', () => {
    const { content } = writer.write({ ...trip, description: 'Münchenstein, Dorf '.repeat(8) })
    const lines = linesOf(content)
    const start = lines.findIndex((line) => line.startsWith('DESCRIPTION:M'))
    const folded = [lines[start] ?? '']
    for (let index = start + 1; lines[index]?.startsWith(' '); index++) {
      folded.push(lines[index] ?? '')
    }

    expect(folded.length).toBeGreaterThan(2)
    for (const line of folded) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    expect(folded.map((line, index) => (index === 0 ? line : line.slice(1))).join('')).toBe(
      `DESCRIPTION:${'Münchenstein\\, Dorf '.repeat(8)}`,
    )
  })
})
