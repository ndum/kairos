import type { Coordinates } from '@/domain/geo'
import { type Instant, MINUTE } from '@/domain/time'
import type { WeatherStep } from '@/domain/weather'

import type { Clock } from './ports/clock'
import type { WeatherPort } from './ports/weather'

/** The forecast of the next hours changes slowly, so it is asked for again after this time. */
export const FORECAST_LIFETIME = 30 * MINUTE

export interface WeatherForecastsDependencies {
  readonly weather: WeatherPort
  readonly clock: Clock
}

interface Entry {
  readonly steps: readonly WeatherStep[]
  readonly fetchedAt: Instant
}

/**
 * Positions leave the device rounded to two decimals, about a kilometre. That is plenty for the
 * weather, and nearby stops share one forecast.
 */
const rounded = ({ latitude, longitude }: Coordinates): Coordinates => ({
  latitude: Math.round(latitude * 100) / 100,
  longitude: Math.round(longitude * 100) / 100,
})

/** Forecasts near the stops of a route, asked for at most every half hour per position. */
export class WeatherForecasts {
  readonly #deps: WeatherForecastsDependencies
  readonly #entries = new Map<string, Entry>()
  readonly #pending = new Map<string, Promise<readonly WeatherStep[] | null>>()

  constructor(deps: WeatherForecastsDependencies) {
    this.#deps = deps
  }

  /** The forecast near a position. Without an answer, the last one known, or else null. */
  near(position: Coordinates): Promise<readonly WeatherStep[] | null> {
    const at = rounded(position)
    const key = `${String(at.latitude)},${String(at.longitude)}`
    const known = this.#entries.get(key)
    if (known && this.#deps.clock.now() - known.fetchedAt < FORECAST_LIFETIME) {
      return Promise.resolve(known.steps)
    }

    const pending = this.#pending.get(key)
    if (pending) return pending
    const request = this.#deps.weather
      .forecast(at)
      .then(
        (steps) => {
          this.#entries.set(key, { steps, fetchedAt: this.#deps.clock.now() })
          return steps
        },
        () => known?.steps ?? null,
      )
      .finally(() => this.#pending.delete(key))
    this.#pending.set(key, request)
    return request
  }
}
