import * as v from 'valibot'

import type { WeatherPort } from '@/application/ports/weather'
import type { Coordinates } from '@/domain/geo'
import { type Duration, SECOND } from '@/domain/time'
import type { Sky, WeatherStep } from '@/domain/weather'

import { HttpError, fetchJson } from '../http/fetch-json'

const DEFAULT_BASE_URL = 'https://api.open-meteo.com/v1'
const DEFAULT_TIMEOUT: Duration = 8 * SECOND

/** Six hours ahead cover every trip on the board. */
const QUARTER_HOURS = 24

const Values = v.array(v.nullable(v.number()))

const ForecastResponseSchema = v.object({
  minutely_15: v.object({
    time: v.array(v.number()),
    temperature_2m: Values,
    precipitation: Values,
    weather_code: Values,
    is_day: Values,
  }),
})

/** Weather codes of the World Meteorological Organization, as Open-Meteo reports them. */
export function skyOf(code: number): Sky {
  if (code <= 1) return 'clear'
  if (code <= 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'cloudy'
}

export interface OpenMeteoOptions {
  readonly baseUrl?: string
  readonly timeout?: Duration
  readonly fetch?: typeof globalThis.fetch
}

/**
 * Forecasts in quarter hours from Open-Meteo (open-meteo.com), which needs no key and is free
 * for non-commercial use with credit. Its best model for Switzerland comes from MeteoSwiss.
 */
export class OpenMeteoWeather implements WeatherPort {
  readonly #baseUrl: string
  readonly #timeout: Duration
  readonly #fetch: typeof globalThis.fetch

  constructor(options: OpenMeteoOptions = {}) {
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.#timeout = options.timeout ?? DEFAULT_TIMEOUT
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  async forecast(position: Coordinates, signal?: AbortSignal): Promise<WeatherStep[]> {
    const params = new URLSearchParams({
      latitude: String(position.latitude),
      longitude: String(position.longitude),
      minutely_15: 'temperature_2m,precipitation,weather_code,is_day',
      // The quarter hour that is under way started before now.
      past_minutely_15: '1',
      forecast_minutely_15: String(QUARTER_HOURS),
      timeformat: 'unixtime',
    })
    const body = await fetchJson(`${this.#baseUrl}/forecast?${params.toString()}`, {
      fetch: this.#fetch,
      timeout: this.#timeout,
      signal,
    })

    const result = v.safeParse(ForecastResponseSchema, body)
    if (!result.success) {
      throw new HttpError('invalid-response', 'api.open-meteo.com sent an unexpected forecast.')
    }
    const { time, temperature_2m, precipitation, weather_code, is_day } = result.output.minutely_15
    return time.flatMap((seconds, index): WeatherStep[] => {
      const temperature = temperature_2m[index]
      const rain = precipitation[index]
      const code = weather_code[index]
      // A model may leave out values, mostly at the end of its range.
      if (temperature == null || rain == null || code == null) return []
      return [
        {
          at: seconds * SECOND,
          temperature,
          precipitation: rain,
          sky: skyOf(code),
          isDay: is_day[index] !== 0,
        },
      ]
    })
  }
}
