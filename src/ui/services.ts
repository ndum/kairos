import { type InjectionKey, inject } from 'vue'

import type { Clock } from '@/application/ports/clock'
import type { TimetablePort } from '@/application/ports/timetable'
import type { RouteLibrary } from '@/application/route-library'
import type { StopSearch } from '@/application/stop-search'

/** Application services, created in the composition root and provided to the whole app. */
export interface AppServices {
  readonly clock: Clock
  readonly timetable: TimetablePort
  readonly routes: RouteLibrary
  readonly stops: StopSearch
}

export const servicesKey: InjectionKey<AppServices> = Symbol('services')

export function useServices(): AppServices {
  const services = inject(servicesKey)
  if (!services) throw new Error('The app services are missing. They are provided in main.ts.')
  return services
}
