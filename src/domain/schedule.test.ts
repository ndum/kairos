import { describe, expect, it } from 'vitest'

import { at } from '@/test/builders'

import { weekdayOf } from './local-time'
import {
  type Schedule,
  type ScheduleDay,
  clockTime,
  directionBySchedule,
  isValidSchedule,
  scheduleDayAt,
  scheduleTarget,
} from './schedule'

// The builders use Monday, 12 October 2026.
const monday: ScheduleDay = { weekday: 1, arriveBy: 8 * 60, returnFrom: 16 * 60 + 30 }
const friday: ScheduleDay = { weekday: 5, arriveBy: 9 * 60 + 40, returnFrom: null }
const schedule: Schedule = [monday, friday]

describe('weekdayOf', () => {
  it('counts the days from Monday in Swiss time', () => {
    expect(weekdayOf(at('07:00'))).toBe(1)
    expect(weekdayOf(Date.parse('2026-10-18T12:00:00+02:00'))).toBe(7)
  })

  it('follows the Swiss date around midnight', () => {
    expect(weekdayOf(Date.parse('2026-10-12T00:30:00+02:00'))).toBe(1)
    expect(weekdayOf(Date.parse('2026-10-12T23:30:00+02:00'))).toBe(1)
  })
})

describe('scheduleDayAt', () => {
  it('finds the times of the day', () => {
    expect(scheduleDayAt(schedule, at('07:00'))).toBe(monday)
  })

  it('finds nothing on other days or without a schedule', () => {
    expect(scheduleDayAt(schedule, Date.parse('2026-10-13T07:00:00+02:00'))).toBeNull()
    expect(scheduleDayAt(undefined, at('07:00'))).toBeNull()
  })
})

describe('scheduleTarget', () => {
  it('asks the way there to arrive by the time of the day', () => {
    expect(scheduleTarget(schedule, 'outbound', at('06:30'))).toEqual({
      kind: 'arrive',
      by: at('08:00'),
    })
  })

  it('starts the way back at the time of the day', () => {
    expect(scheduleTarget(schedule, 'return', at('12:00'))).toEqual({
      kind: 'return',
      from: at('16:30'),
    })
  })

  it('sets nothing once the time has passed or for a direction without a time', () => {
    expect(scheduleTarget(schedule, 'outbound', at('08:00'))).toBeNull()
    expect(scheduleTarget(schedule, 'return', at('16:30'))).toBeNull()
    expect(scheduleTarget(schedule, 'return', Date.parse('2026-10-16T12:00:00+02:00'))).toBeNull()
    expect(scheduleTarget([], 'outbound', at('06:30'))).toBeNull()
  })
})

describe('directionBySchedule', () => {
  it('shows the way there until an hour after the arrival time, then the way back', () => {
    expect(directionBySchedule(monday, 7 * 60)).toBe('outbound')
    expect(directionBySchedule(monday, 8 * 60 + 59)).toBe('outbound')
    expect(directionBySchedule(monday, 9 * 60)).toBe('return')
  })

  it('decides from the time of the way back on when there is no arrival time', () => {
    const afternoon: ScheduleDay = { weekday: 1, arriveBy: null, returnFrom: 15 * 60 }

    expect(directionBySchedule(afternoon, 10 * 60)).toBeNull()
    expect(directionBySchedule(afternoon, 15 * 60)).toBe('return')
  })

  it('leaves days without times to others', () => {
    expect(directionBySchedule(null, 7 * 60)).toBeNull()
  })
})

describe('isValidSchedule', () => {
  it('accepts every weekday once with at least one time', () => {
    expect(isValidSchedule(schedule)).toBe(true)
    expect(isValidSchedule([])).toBe(true)
  })

  it('rejects repeated days, empty days and times outside the day', () => {
    expect(isValidSchedule([monday, monday])).toBe(false)
    expect(isValidSchedule([{ weekday: 2, arriveBy: null, returnFrom: null }])).toBe(false)
    expect(isValidSchedule([{ weekday: 2, arriveBy: 24 * 60, returnFrom: null }])).toBe(false)
    expect(isValidSchedule([{ weekday: 2, arriveBy: 7.5, returnFrom: null }])).toBe(false)
  })

  it('rejects a way back that starts before the arrival', () => {
    expect(isValidSchedule([{ weekday: 2, arriveBy: 10 * 60, returnFrom: 9 * 60 }])).toBe(false)
  })
})

describe('clockTime', () => {
  it('writes minutes since midnight as a clock time', () => {
    expect(clockTime(8 * 60 + 5)).toBe('08:05')
    expect(clockTime(0)).toBe('00:00')
  })
})
