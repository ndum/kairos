import { useStorage } from '@vueuse/core'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { loadLocale } from '../i18n'
import { LOCALE_STORAGE_KEY, type LocalePreference, resolveLocale } from '../i18n/locale'

/**
 * The language chosen in the settings. Changing it switches the language as soon as its
 * messages are there.
 */
export function useLanguage() {
  const composer = useI18n({ useScope: 'global' })
  const preference = useStorage<LocalePreference>(LOCALE_STORAGE_KEY, 'auto')

  // A later choice wins, even when the messages of an earlier one arrive after it.
  let request = 0
  watch(preference, async (value) => {
    const id = ++request
    const locale = resolveLocale(value, navigator.languages)
    await loadLocale(composer, locale)
    if (id === request) composer.locale.value = locale
  })

  return preference
}
