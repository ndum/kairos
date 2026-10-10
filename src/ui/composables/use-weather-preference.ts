import { useStorage } from '@vueuse/core'

/** Kept per device: whether the board shows the weather, which asks Open-Meteo for it. */
export const WEATHER_STORAGE_KEY = 'kairos:weather'

export const useWeatherPreference = () => useStorage(WEATHER_STORAGE_KEY, true)
