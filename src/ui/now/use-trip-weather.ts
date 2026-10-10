import { useIntervalFn } from '@vueuse/core'
import { type Ref, computed, shallowRef, watch } from 'vue'

import { expectedTime, ridesOf } from '@/domain/journey'
import type { Endpoints } from '@/domain/route'
import { MINUTE } from '@/domain/time'
import type { Trip } from '@/domain/trip'
import { type WeatherStep, weatherAt, wetDuring } from '@/domain/weather'

import { useWeatherPreference } from '../composables/use-weather-preference'
import { useServices } from '../services'

/** Forecasts age while the board is open. The service decides whether to ask again. */
const RELOAD_INTERVAL = 10 * MINUTE

export interface WetWalk {
  readonly walk: 'to-stop' | 'from-stop'
  /** The stop at the end of the walk to it, or at the start of the walk from it. */
  readonly stop: string
  readonly step: WeatherStep
}

export interface TripWeather {
  /** The weather at the stop of the origin when the user leaves. */
  readonly leaving: WeatherStep | null
  /** Rain or snow on one of the two walks, the walk to the stop first. */
  readonly wet: WetWalk | null
}

/**
 * The weather around a trip: when leaving, and on the walks to and from the vehicles. It asks
 * for the forecasts at the stops only, never at the places, and not at all when switched off.
 */
export function useTripWeather(trip: Ref<Trip | null>, ends: Ref<Endpoints>) {
  const { weather } = useServices()
  const enabled = useWeatherPreference()
  const origin = shallowRef<readonly WeatherStep[] | null>(null)
  const destination = shallowRef<readonly WeatherStep[] | null>(null)

  const positions = computed(() =>
    enabled.value
      ? [
          ends.value.origin.stop.coordinates ?? null,
          ends.value.destination.stop.coordinates ?? null,
        ]
      : null,
  )

  let request = 0
  async function load(): Promise<void> {
    const current = positions.value
    const id = ++request
    const [from = null, to = null] = current
      ? await Promise.all(
          current.map((position) => (position ? weather.near(position) : Promise.resolve(null))),
        )
      : []
    // A newer request may have finished first, for example after switching routes.
    if (id !== request) return
    origin.value = from
    destination.value = to
  }

  watch(
    () => JSON.stringify(positions.value),
    () => void load(),
    { immediate: true },
  )
  useIntervalFn(() => void load(), RELOAD_INTERVAL)

  /** Rain or snow on the walk to the first vehicle, or else on the walk from the last one. */
  function wetWalkOf(trip: Trip): WetWalk | null {
    const rides = ridesOf(trip.journey)
    const first = rides[0]
    const last = rides.at(-1)
    const toStop =
      origin.value && first ? wetDuring(origin.value, trip.leaveAt, trip.departureAt) : null
    if (toStop && first) return { walk: 'to-stop', stop: first.departure.stop.name, step: toStop }
    const fromStop =
      destination.value && last
        ? wetDuring(destination.value, expectedTime(last.arrival), trip.arrivalAt)
        : null
    if (fromStop && last) return { walk: 'from-stop', stop: last.arrival.stop.name, step: fromStop }
    return null
  }

  return computed<TripWeather | null>(() => {
    const current = trip.value
    if (!enabled.value || !current) return null
    const leaving = origin.value ? weatherAt(origin.value, current.leaveAt) : null
    const wet = wetWalkOf(current)
    return leaving || wet ? { leaving, wet } : null
  })
}
