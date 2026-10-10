import { type Composer, createI18n } from 'vue-i18n'

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale, resolveLocale } from './locale'
import de from './locales/de.json'

export type MessageSchema = typeof de

/**
 * German is the default and the fallback, so it comes with the app. Every other language loads
 * when it is used, which keeps the JavaScript of the start small.
 */
type LoadedLater = Exclude<Locale, 'de'>

const loaders: Record<LoadedLater, () => Promise<MessageSchema>> = {
  en: () => import('./locales/en.json').then((module) => module.default),
  fr: () => import('./locales/fr.json').then((module) => module.default),
  it: () => import('./locales/it.json').then((module) => module.default),
}

const loadsLater = (locale: Locale): locale is LoadedLater => locale in loaders

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
    messages: { de } as Record<Locale, MessageSchema>,
  })
}

/** Loads the messages of a language unless they are there already. */
export async function loadLocale(
  composer: Pick<Composer, 'availableLocales' | 'setLocaleMessage'>,
  locale: Locale,
): Promise<void> {
  if (!loadsLater(locale) || composer.availableLocales.includes(locale)) return
  composer.setLocaleMessage(locale, await loaders[locale]())
}
