import { useRegisterSW } from 'virtual:pwa-register/vue'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { HOUR } from '@/domain/time'

import { useToastStore } from '../stores/toasts'

/**
 * Registers the service worker and offers a new version as soon as it is ready. The app
 * never reloads by itself, so a countdown the user is looking at does not vanish.
 */
export function useAppUpdate(): void {
  const { t } = useI18n()
  const toasts = useToastStore()
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    // Commuters keep the app open for long, so it also looks for a new version every hour.
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), HOUR)
    },
  })

  watch(needRefresh, (needed) => {
    if (!needed) return
    toasts.show(
      t('update.available'),
      { label: t('update.reload'), run: () => void updateServiceWorker(true) },
      { persistent: true },
    )
  })
}
