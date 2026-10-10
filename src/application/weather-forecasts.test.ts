import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MINUTE } from '@/domain/time'
import type { WeatherStep } from '@/domain/weather'
import { at } from '@/test/builders'
import { FakeClock } from '@/test/fakes'

import type { WeatherPort } from './ports/weather'
import { FORECAST_LIFETIME, WeatherForecasts } from './weather-forecasts'

const liestal = { latitude: 47.48446, longitude: 7.73137 }
const forecast: WeatherStep[] = [
  { at: at('07:00'), temperature: 8.1, precipitation: 0, sky: 'cloudy', isDay: true },
]

describe('WeatherForecasts', () => {
  let clock: FakeClock
  let weather: { forecast: ReturnType<typeof vi.fn<WeatherPort['forecast']>> }
  let forecasts: WeatherForecasts

  beforeEach(() => {
    clock = new FakeClock(at('07:00'))
    weather = { forecast: vi.fn<WeatherPort['forecast']>(() => Promise.resolve(forecast)) }
    forecasts = new WeatherForecasts({ weather, clock })
  })

  it('asks for the weather with a position rounded to about a kilometre', async () => {
    expect(await forecasts.near(liestal)).toEqual(forecast)
    expect(weather.forecast).toHaveBeenCalledWith({ latitude: 47.48, longitude: 7.73 })
  })

  it('keeps a forecast for half an hour and shares it with nearby stops', async () => {
    await forecasts.near(liestal)
    clock.time += FORECAST_LIFETIME - MINUTE
    await forecasts.near({ latitude: 47.4812, longitude: 7.7296 })
    expect(weather.forecast).toHaveBeenCalledTimes(1)

    clock.time += MINUTE
    await forecasts.near(liestal)
    expect(weather.forecast).toHaveBeenCalledTimes(2)
  })

  it('asks only once while a request is under way', async () => {
    await Promise.all([forecasts.near(liestal), forecasts.near(liestal)])

    expect(weather.forecast).toHaveBeenCalledTimes(1)
  })

  it('falls back to the last forecast, or to none, when the service fails', async () => {
    weather.forecast.mockRejectedValueOnce(new Error('offline'))
    expect(await forecasts.near(liestal)).toBeNull()

    await forecasts.near(liestal)
    clock.time += FORECAST_LIFETIME
    weather.forecast.mockRejectedValueOnce(new Error('offline'))
    expect(await forecasts.near(liestal)).toEqual(forecast)
  })
})
