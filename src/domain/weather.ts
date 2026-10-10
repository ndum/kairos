import { type Instant, MINUTE } from './time'

/** What the sky does, in the few kinds the app tells apart. */
export type Sky = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'

/** The weather at one place during a quarter of an hour. */
export interface WeatherStep {
  /** Start of the quarter hour. */
  readonly at: Instant
  /** Air temperature in degrees Celsius. */
  readonly temperature: number
  /** Rain or snow during the quarter hour, in millimetres of water. */
  readonly precipitation: number
  readonly sky: Sky
  /** Daylight, so a clear sky shows the sun or the moon. */
  readonly isDay: boolean
}

export const WEATHER_STEP = 15 * MINUTE

/** Less than this in a quarter hour barely wets a walk. */
export const WET_THRESHOLD = 0.1

/** The weather of the quarter hour an instant falls in. */
export function weatherAt(steps: readonly WeatherStep[], at: Instant): WeatherStep | null {
  return steps.find((step) => step.at <= at && at < step.at + WEATHER_STEP) ?? null
}

/** The wettest quarter hour during a span such as a walk, if rain or snow is expected. */
export function wetDuring(
  steps: readonly WeatherStep[],
  from: Instant,
  to: Instant,
): WeatherStep | null {
  let wettest: WeatherStep | null = null
  for (const step of steps) {
    const overlaps = step.at < to && from < step.at + WEATHER_STEP
    if (!overlaps || step.precipitation < WET_THRESHOLD) continue
    if (!wettest || step.precipitation > wettest.precipitation) wettest = step
  }
  return wettest
}
