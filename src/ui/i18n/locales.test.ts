import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

type Messages = Record<string, unknown>

// The files are read as they are, because the build turns imported messages into code.
const messagesOf = (locale: string): Messages =>
  JSON.parse(readFileSync(new URL(`./locales/${locale}.json`, import.meta.url), 'utf8')) as Messages

/** Every text of a message file by its path, for example "now.title". */
function textsOf(messages: Messages, prefix = ''): Map<string, string> {
  const texts = new Map<string, string>()
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') texts.set(path, value)
    else for (const entry of textsOf(value as Messages, path)) texts.set(...entry)
  }
  return texts
}

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name ?? '').sort()
const pluralForms = (text: string): number => text.split(' | ').length

const reference = textsOf(messagesOf('de'))

describe.each(['en', 'fr', 'it'])('the %s messages', (locale) => {
  const texts = textsOf(messagesOf(locale))

  it('hold every text of the German ones and nothing else', () => {
    expect([...texts.keys()].sort()).toEqual([...reference.keys()].sort())
  })

  it('keep the placeholders and plural forms of every text', () => {
    for (const [path, text] of reference) {
      const translated = texts.get(path) ?? ''
      expect(placeholders(translated), path).toEqual(placeholders(text))
      expect(pluralForms(translated), path).toBe(pluralForms(text))
    }
  })
})
