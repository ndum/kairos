import { type Composer, createI18n } from 'vue-i18n'

import { LOCALE_STORAGE_KEY, type Locale, resolveLocale } from './locale'
import type de from './locales/de.json'

export type MessageSchema = typeof de

/**
 * Every language loads when it is used, German included, which keeps the JavaScript of the
 * start small. The app waits for the language of the device before it starts. A test keeps all
 * languages complete, so no fallback is needed.
 */
const loaders: Record<Locale, () => Promise<MessageSchema>> = {
  de: () => import('./locales/de.json').then((module) => module.default),
  en: () => import('./locales/en.json').then((module) => module.default),
  fr: () => import('./locales/fr.json').then((module) => module.default),
  it: () => import('./locales/it.json').then((module) => module.default),
}

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
    fallbackLocale: false,
    messages: {} as Record<Locale, MessageSchema>,
  })
}

/** Loads the messages of a language unless they are there already. */
export async function loadLocale(
  composer: Pick<Composer, 'availableLocales' | 'setLocaleMessage'>,
  locale: Locale,
): Promise<void> {
  if (composer.availableLocales.includes(locale)) return
  composer.setLocaleMessage(locale, await loaders[locale]())
}
