import { createI18n } from 'vue-i18n'

import { DEFAULT_LOCALE, type Locale, detectLocale } from './locale'
import de from './locales/de.json'
import en from './locales/en.json'

export type MessageSchema = typeof de

export function createAppI18n(locale: Locale = detectLocale(navigator.languages)) {
  return createI18n<[MessageSchema], Locale, false>({
    legacy: false,
    locale,
    fallbackLocale: DEFAULT_LOCALE,
    messages: { de, en },
  })
}
