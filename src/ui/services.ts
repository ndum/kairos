import { type InjectionKey, inject } from 'vue'

import type { Clock } from '@/application/ports/clock'
import type { LocationPort } from '@/application/ports/location'
import type { PinStore } from '@/application/ports/pin-store'
import type { RouteCodec } from '@/application/ports/route-codec'
import type { TimetablePort } from '@/application/ports/timetable'
import type { RouteLibrary } from '@/application/route-library'
import type { StopSearch } from '@/application/stop-search'
import type { TripMonitor } from '@/application/trip-monitor'

/** Application services, created in the composition root and provided to the whole app. */
export interface AppServices {
  readonly clock: Clock
  readonly timetable: TimetablePort
  readonly routes: RouteLibrary
  readonly stops: StopSearch
  readonly codec: RouteCodec
  readonly location: LocationPort
  readonly pins: PinStore
  /** Each board watches its connection with a monitor of its own. */
  readonly createTripMonitor: () => TripMonitor
}

export const servicesKey: InjectionKey<AppServices> = Symbol('services')

export function useServices(): AppServices {
  const services = inject(servicesKey)
  if (!services) throw new Error('The app services are missing. They are provided in main.ts.')
  return services
}
