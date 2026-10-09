import { useStorage } from '@vueuse/core'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { LOCALE_STORAGE_KEY, type LocalePreference, resolveLocale } from '../i18n/locale'

/** The language chosen in the settings. Changing it switches the language right away. */
export function useLanguage() {
  const { locale } = useI18n({ useScope: 'global' })
  const preference = useStorage<LocalePreference>(LOCALE_STORAGE_KEY, 'auto')

  watch(preference, (value) => {
    locale.value = resolveLocale(value, navigator.languages)
  })

  return preference
}
