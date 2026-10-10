export const LOCALES = ['de', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'de'

/** The language chosen in the settings, or "auto" to follow the device. */
export type LocalePreference = 'auto' | Locale

export const LOCALE_STORAGE_KEY = 'kairos:locale'

const isLocale = (value: unknown): value is Locale => LOCALES.some((locale) => locale === value)

/** Picks the first supported language from the browser preferences, for example de-CH. */
export function detectLocale(preferences: readonly string[]): Locale {
  for (const tag of preferences) {
    const language = tag.trim().toLowerCase().split('-')[0]
    const match = LOCALES.find((locale) => locale === language)
    if (match) return match
  }
  return DEFAULT_LOCALE
}

/** The chosen language, or the one of the device for "auto" and unknown values. */
export const resolveLocale = (preference: string | null, languages: readonly string[]): Locale =>
  isLocale(preference) ? preference : detectLocale(languages)

/** Formats numbers and times with Swiss conventions in both languages. */
export const formattingLocale = (locale: string): string => `${locale}-CH`
