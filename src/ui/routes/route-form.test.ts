import { describe, expect, it } from 'vitest'

import { NAME_MAX_LENGTH } from '@/domain/route-rules'
import { busLine, home, office, route, stop, trainLine } from '@/test/builders'

import {
  type RouteForm,
  draftOf,
  emptyForm,
  formOf,
  nameError,
  placeErrors,
  suggestedName,
} from './route-form'

const commute = route('commute', 'Commute', [home, office], [trainLine('S1'), busLine('20')])

const filled = (): RouteForm => ({
  name: 'Commute',
  places: [
    { name: 'Home', stop: stop('Riverside'), walk: 8, reserve: 3 },
    { name: 'Office', stop: stop('Market Square'), walk: 5, reserve: 3 },
  ],
  preferredLines: [trainLine('S1'), busLine('20')],
})

describe('formOf and draftOf', () => {
  it('turn a route into a form with minutes and back', () => {
    const form = formOf(commute)

    expect(form).toEqual(filled())
    expect(draftOf(form)).toEqual({
      name: 'Commute',
      places: [home, office],
      preferredLines: [trainLine('S1'), busLine('20')],
    })
  })

  it('keep the position of a place', () => {
    const position = { latitude: 46.8, longitude: 7.5 }
    const located = route('commute', 'Commute', [{ ...home, coordinates: position }, office])

    expect(formOf(located).places[0].coordinates).toEqual(position)
    expect(draftOf(formOf(located)).places[0].coordinates).toEqual(position)
  })

  it('refuse a form without stops', () => {
    expect(() => draftOf(emptyForm())).toThrow()
  })
})

describe('suggestedName', () => {
  it('connects the names of both places', () => {
    expect(suggestedName(filled())).toBe('Home ↔ Office')
  })

  it('uses what is there while the form is incomplete', () => {
    const form = emptyForm()
    form.places[0].name = ' Home '

    expect(suggestedName(form)).toBe('Home')
  })
})

describe('placeErrors', () => {
  it('accepts a complete place', () => {
    expect(placeErrors(filled(), 0)).toEqual({})
    expect(placeErrors(filled(), 1)).toEqual({})
  })

  it('asks for a name and a stop', () => {
    expect(placeErrors(emptyForm(), 0)).toEqual({ name: 'missing', stop: 'missing' })
  })

  it('limits the length of the name', () => {
    const form = filled()
    form.places[1].name = 'x'.repeat(NAME_MAX_LENGTH + 1)

    expect(placeErrors(form, 1)).toEqual({ name: 'too-long' })
  })

  it('needs a destination stop that differs from the start', () => {
    const form = filled()
    form.places[1].stop = stop('Riverside')

    expect(placeErrors(form, 1)).toEqual({ stop: 'same' })
  })
})

describe('nameError', () => {
  it('requires a route name of reasonable length', () => {
    expect(nameError(filled())).toBeUndefined()
    expect(nameError({ ...filled(), name: ' ' })).toBe('missing')
    expect(nameError({ ...filled(), name: 'x'.repeat(NAME_MAX_LENGTH + 1) })).toBe('too-long')
  })
})
