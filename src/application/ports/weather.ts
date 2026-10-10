import type { Coordinates } from '@/domain/geo'
import type { WeatherStep } from '@/domain/weather'

/** Weather forecasts for the next hours, in quarter hours from the current one on. */
export interface WeatherPort {
  forecast(position: Coordinates, signal?: AbortSignal): Promise<WeatherStep[]>
}
