import { describe, expect, it } from 'vitest'

import { directionNoteOf } from './direction-note'

const found = { kind: 'found', coordinates: { latitude: 47.56, longitude: 7.6 } } as const

describe('directionNoteOf', () => {
  it('says when the location chose the direction', () => {
    expect(directionNoteOf('location', found)).toBe('location')
  })

  it('says when the time of day decided although the position is known', () => {
    expect(directionNoteOf('time', found)).toBe('time')
  })

  it('tells why the position is not known', () => {
    expect(directionNoteOf('time', { kind: 'locating' })).toBe('locating')
    expect(directionNoteOf('time', { kind: 'denied' })).toBe('denied')
    expect(directionNoteOf('time', { kind: 'unavailable' })).toBe('unavailable')
  })

  it('says when the schedule chose the direction, also without the location', () => {
    expect(directionNoteOf('schedule', found)).toBe('schedule')
    expect(directionNoteOf('schedule', { kind: 'off' })).toBe('schedule')
  })

  it('stays silent when the user chose the direction or keeps the location off', () => {
    expect(directionNoteOf('swapped', found)).toBeNull()
    expect(directionNoteOf('time', { kind: 'off' })).toBeNull()
  })
})
