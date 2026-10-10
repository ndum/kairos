import { nextTick, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { START_LOCATION, useRoute, useRouter } from 'vue-router'

/** Moves the focus to the heading of the page, which screen readers then read out. */
export function focusMainHeading(): void {
  document.querySelector<HTMLElement>('main h1')?.focus()
}

/**
 * Keeps the page title in step with the area of the app, and after moving to another page
 * starts at its heading, as a page load would.
 */
export function usePageNavigation(): void {
  const { t } = useI18n()
  const router = useRouter()
  const route = useRoute()

  watchEffect(() => {
    const section = route.meta.section
    document.title = section ? `${t(`nav.${section}`)} – ${t('app.name')}` : t('app.name')
  })

  router.afterEach((_to, from, failure) => {
    if (failure || from === START_LOCATION) return
    void nextTick(focusMainHeading)
  })
}
