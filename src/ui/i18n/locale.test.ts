import { describe, expect, it } from 'vitest'

import { detectLocale, formattingLocale } from './locale'

describe('detectLocale', () => {
  it('picks the first supported language', () => {
    expect(detectLocale(['fr-CH', 'en-GB', 'de'])).toBe('en')
    expect(detectLocale(['de-CH', 'en'])).toBe('de')
  })

  it('falls back to German', () => {
    expect(detectLocale(['it-CH', 'fr'])).toBe('de')
    expect(detectLocale([])).toBe('de')
  })
})

describe('formattingLocale', () => {
  it('uses Swiss formatting in both languages', () => {
    expect(formattingLocale('de')).toBe('de-CH')
    expect(formattingLocale('en')).toBe('en-CH')
  })
})
