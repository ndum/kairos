import { describe, expect, it, vi } from 'vitest'

import { HttpError } from '../http/fetch-json'
import { OpenMeteoWeather, skyOf } from './open-meteo-weather'

const liestal = { latitude: 47.48, longitude: 7.73 }

// 19 October 2026, 06:45 and 07:00 in Swiss time.
const response = {
  latitude: 47.47874,
  longitude: 7.721969,
  minutely_15_units: { time: 'unixtime', temperature_2m: '°C', precipitation: 'mm' },
  minutely_15: {
    time: [1792385100, 1792386000, 1792386900],
    temperature_2m: [7.4, 7.9, null],
    precipitation: [0, 0.4, null],
    weather_code: [3, 61, null],
    is_day: [0, 1, null],
  },
}

const answering = (body: unknown) =>
  vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body))))

describe('OpenMeteoWeather', () => {
  it('asks for the next hours in quarter hours', async () => {
    const fetch = answering(response)
    await new OpenMeteoWeather({ fetch }).forecast(liestal)

    const input = fetch.mock.calls[0]?.[0]
    if (typeof input !== 'string') throw new Error('Expected a request to a URL string')
    const url = new URL(input)
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '47.48',
      longitude: '7.73',
      minutely_15: 'temperature_2m,precipitation,weather_code,is_day',
      past_minutely_15: '1',
      forecast_minutely_15: '24',
      timeformat: 'unixtime',
    })
  })

  it('turns the forecast into quarter hours and skips missing values', async () => {
    const steps = await new OpenMeteoWeather({ fetch: answering(response) }).forecast(liestal)

    expect(steps).toEqual([
      { at: 1792385100_000, temperature: 7.4, precipitation: 0, sky: 'cloudy', isDay: false },
      { at: 1792386000_000, temperature: 7.9, precipitation: 0.4, sky: 'rain', isDay: true },
    ])
  })

  it('rejects an unexpected answer', async () => {
    const weather = new OpenMeteoWeather({ fetch: answering({ reason: 'busy' }) })

    await expect(weather.forecast(liestal)).rejects.toBeInstanceOf(HttpError)
  })
})

describe('skyOf', () => {
  it('sorts the weather codes into what the app shows', () => {
    expect([0, 1, 2, 3, 45, 48].map(skyOf)).toEqual([
      'clear',
      'clear',
      'cloudy',
      'cloudy',
      'fog',
      'fog',
    ])
    expect([51, 57, 61, 67, 80, 82].map(skyOf)).toEqual([
      'drizzle',
      'drizzle',
      'rain',
      'rain',
      'rain',
      'rain',
    ])
    expect([71, 77, 85, 86, 95, 99].map(skyOf)).toEqual([
      'snow',
      'snow',
      'snow',
      'snow',
      'thunder',
      'thunder',
    ])
  })
})
