import { useStorage, useWakeLock } from '@vueuse/core'
import { type Ref, watch } from 'vue'

/** Kept per device: whether the screen stays on while the board is shown. */
export const AWAKE_STORAGE_KEY = 'kairos:awake'

export const useAwakePreference = () => useStorage(AWAKE_STORAGE_KEY, false)

/**
 * Keeps the screen on while enabled, so the countdown stays in view. The browser releases
 * the lock when the page is hidden, and it is requested again when the page shows.
 */
export function useKeepAwake(enabled: Ref<boolean>): void {
  const { isSupported, request, release } = useWakeLock()

  watch(
    enabled,
    (keepAwake) => {
      if (!isSupported.value) return
      // The browser may refuse, for example in battery saving mode. The app works on.
      if (keepAwake) request('screen').catch(() => undefined)
      else void release()
    },
    { immediate: true },
  )
}
