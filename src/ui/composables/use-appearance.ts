import { createSharedComposable, useColorMode, usePreferredReducedMotion } from '@vueuse/core'
import { computed } from 'vue'

/** Also read by the inline script in index.html, which applies the theme before the first paint. */
export const THEME_STORAGE_KEY = 'kairos:theme'

/** Shared, so the app and the settings change one and the same state. */
export const useAppearance = createSharedComposable(() => {
  const colorMode = useColorMode({ storageKey: THEME_STORAGE_KEY, disableTransition: false })
  const reducedMotion = usePreferredReducedMotion()

  return {
    /** The user's choice: follow the system, or always light or dark. */
    theme: colorMode.store,
    /** Movements are frozen when the system asks for reduced motion. */
    still: computed(() => reducedMotion.value === 'reduce'),
  }
})
