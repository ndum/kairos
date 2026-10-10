import { describe, expect, it } from 'vitest'

import { OpenMeteoWeather } from './open-meteo-weather'

// Runs against the real service in a scheduled workflow, so changes on its side show up early.

describe('Open-Meteo contract', () => {
  it('forecasts the next hours in quarter hours', async () => {
    const steps = await new OpenMeteoWeather({ timeout: 20_000 }).forecast({
      latitude: 47.56,
      longitude: 7.6,
    })

    expect(steps.length).toBeGreaterThanOrEqual(20)
    expect(steps[1]?.at).toBe((steps[0]?.at ?? 0) + 15 * 60_000)
    expect(steps[0]?.temperature).toBeGreaterThan(-40)
    expect(steps[0]?.temperature).toBeLessThan(50)
  })
})
