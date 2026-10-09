export const LOCALES = ['de', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'de'

/** Picks the first supported language from the browser preferences, for example de-CH. */
export function detectLocale(preferences: readonly string[]): Locale {
  for (const tag of preferences) {
    const language = tag.trim().toLowerCase().split('-')[0]
    const match = LOCALES.find((locale) => locale === language)
    if (match) return match
  }
  return DEFAULT_LOCALE
}

/** Formats numbers and times with Swiss conventions in both languages. */
export const formattingLocale = (locale: Locale): string => `${locale}-CH`
