import { useStorage } from '@vueuse/core'

/** Kept per device and never shared: whether the position may choose the direction. */
export const LOCATION_STORAGE_KEY = 'kairos:location'

export const useLocationPreference = () => useStorage(LOCATION_STORAGE_KEY, false)
