import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { type Ref, ref, watch } from 'vue'

import type { LocationResult } from '@/application/ports/location'
import { MINUTE } from '@/domain/time'

import { useServices } from '../services'

/** Often enough to notice a change of place, rarely enough to save battery. */
const INTERVAL = 5 * MINUTE

/** The position as the board knows it: switched off, still searched, or the last answer. */
export type DeviceLocation =
  { readonly kind: 'off' } | { readonly kind: 'locating' } | LocationResult

/**
 * The position of the device while the app is visible and the user allows it. It stays on
 * the device and only chooses the direction of the board.
 */
export function useDeviceLocation(enabled: Ref<boolean>): Ref<DeviceLocation> {
  const { location } = useServices()
  const state = ref<DeviceLocation>({ kind: 'off' })
  const visibility = useDocumentVisibility()
  let latest = 0

  async function locate(): Promise<void> {
    if (!enabled.value || visibility.value === 'hidden') return
    const reading = ++latest
    if (state.value.kind === 'off') state.value = { kind: 'locating' }
    const result = await location.current()
    // A slow answer must not replace a newer one, nor come back once the user switched off,
    // which also counts as newer.
    if (reading === latest) state.value = result
  }

  useIntervalFn(() => void locate(), INTERVAL)
  watch([enabled, visibility], () => void locate(), { immediate: true })
  watch(enabled, (isEnabled) => {
    if (isEnabled) return
    latest++
    state.value = { kind: 'off' }
  })

  return state
}
