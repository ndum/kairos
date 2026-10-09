import { createI18n } from 'vue-i18n'

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale, resolveLocale } from './locale'
import de from './locales/de.json'
import en from './locales/en.json'

export type MessageSchema = typeof de

/** Reading localStorage throws when the user blocks site data. */
function storedPreference(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

export function createAppI18n(
  locale: Locale = resolveLocale(storedPreference(), navigator.languages),
) {
  return createI18n<[MessageSchema], Locale, false>({
    legacy: false,
    locale,
    fallbackLocale: DEFAULT_LOCALE,
    messages: { de, en },
  })
}
