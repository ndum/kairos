import { describe, expect, it } from 'vitest'

import { at } from '@/test/builders'

import { type WeatherStep, weatherAt, wetDuring } from './weather'

const step = (
  time: string,
  precipitation = 0,
  sky: WeatherStep['sky'] = 'cloudy',
): WeatherStep => ({
  at: at(time),
  temperature: 9.4,
  precipitation,
  sky,
  isDay: true,
})

const steps = [step('07:00'), step('07:15', 0.05), step('07:30', 0.6, 'rain'), step('07:45', 0.3)]

describe('weatherAt', () => {
  it('finds the quarter hour an instant falls in', () => {
    expect(weatherAt(steps, at('07:29'))).toBe(steps[1])
    expect(weatherAt(steps, at('07:30'))).toBe(steps[2])
  })

  it('finds nothing outside the forecast', () => {
    expect(weatherAt(steps, at('06:59'))).toBeNull()
    expect(weatherAt(steps, at('08:00'))).toBeNull()
  })
})

describe('wetDuring', () => {
  it('finds the wettest quarter hour of a walk', () => {
    expect(wetDuring(steps, at('07:40'), at('07:50'))).toBe(steps[2])
  })

  it('ignores a trace of rain and quarter hours outside the walk', () => {
    expect(wetDuring(steps, at('07:05'), at('07:30'))).toBeNull()
    expect(wetDuring([], at('07:05'), at('07:30'))).toBeNull()
  })
})
