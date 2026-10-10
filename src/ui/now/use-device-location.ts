import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { type Ref, ref, watch } from 'vue'

import type { Coordinates } from '@/domain/geo'
import { MINUTE } from '@/domain/time'

import { useServices } from '../services'

/** Often enough to notice a change of place, rarely enough to save battery. */
const INTERVAL = 5 * MINUTE

/**
 * The position of the device while the app is visible and the user allows it. It stays on
 * the device and only chooses the direction of the board.
 */
export function useDeviceLocation(enabled: Ref<boolean>): Ref<Coordinates | null> {
  const { location } = useServices()
  const position = ref<Coordinates | null>(null)
  const visibility = useDocumentVisibility()

  async function locate(): Promise<void> {
    if (!enabled.value || visibility.value === 'hidden') return
    const result = await location.current()
    position.value = result.kind === 'found' ? result.coordinates : null
  }

  useIntervalFn(() => void locate(), INTERVAL)
  watch([enabled, visibility], () => void locate(), { immediate: true })
  watch(enabled, (isEnabled) => {
    if (!isEnabled) position.value = null
  })

  return position
}
