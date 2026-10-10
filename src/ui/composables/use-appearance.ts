import {
  createSharedComposable,
  useColorMode,
  usePreferredReducedMotion,
  useStorage,
} from '@vueuse/core'
import { computed, watchEffect } from 'vue'

/** Also read by the inline script in index.html, which applies the theme before the first paint. */
export const THEME_STORAGE_KEY = 'kairos:theme'

/** Kept per device: whether the app holds still regardless of the system setting. */
export const STILL_STORAGE_KEY = 'kairos:still'

/** Shared, so the app and the settings change one and the same state. */
export const useAppearance = createSharedComposable(() => {
  const colorMode = useColorMode({ storageKey: THEME_STORAGE_KEY, disableTransition: false })
  const systemMotion = usePreferredReducedMotion()
  const reduceMotion = useStorage(STILL_STORAGE_KEY, false)

  // The class stops animations and transitions in the whole app, see main.css.
  watchEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion.value)
  })

  return {
    /** The user's choice: follow the system, or always light or dark. */
    theme: colorMode.store,
    /** The user's choice to reduce motion in the app, on top of the system setting. */
    reduceMotion,
    /** Movements are frozen when the system or the app asks for reduced motion. */
    still: computed(() => reduceMotion.value || systemMotion.value === 'reduce'),
  }
})
