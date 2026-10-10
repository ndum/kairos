import { describe, expect, it } from 'vitest'

import { detectLocale, formattingLocale, resolveLocale } from './locale'

describe('detectLocale', () => {
  it('picks the first supported language', () => {
    expect(detectLocale(['rm-CH', 'fr-CH', 'de'])).toBe('fr')
    expect(detectLocale(['it-CH', 'de'])).toBe('it')
    expect(detectLocale(['de-CH', 'en'])).toBe('de')
  })

  it('falls back to German', () => {
    expect(detectLocale(['rm-CH', 'es'])).toBe('de')
    expect(detectLocale([])).toBe('de')
  })
})

describe('resolveLocale', () => {
  it('uses the chosen language', () => {
    expect(resolveLocale('en', ['de-CH'])).toBe('en')
  })

  it('follows the device for "auto" and unknown values', () => {
    expect(resolveLocale('auto', ['en-GB'])).toBe('en')
    expect(resolveLocale('es', ['de-CH'])).toBe('de')
    expect(resolveLocale(null, ['en'])).toBe('en')
  })
})

describe('formattingLocale', () => {
  it('uses Swiss formatting in every language', () => {
    expect(formattingLocale('de')).toBe('de-CH')
    expect(formattingLocale('en')).toBe('en-CH')
    expect(formattingLocale('fr')).toBe('fr-CH')
    expect(formattingLocale('it')).toBe('it-CH')
  })
})
