import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { type Ref, ref, watch } from 'vue'

import { type Duration, type Instant, SECOND } from '@/domain/time'

import { useServices } from '../services'

/** The time of the app clock, updated every second while the page is visible. */
export function useNow(interval: Duration = SECOND): Ref<Instant> {
  const { clock } = useServices()
  const now = ref(clock.now())
  const visibility = useDocumentVisibility()

  const ticker = useIntervalFn(() => {
    now.value = clock.now()
  }, interval)

  watch(visibility, (state) => {
    if (state === 'hidden') {
      ticker.pause()
      return
    }
    now.value = clock.now()
    ticker.resume()
  })

  return now
}
