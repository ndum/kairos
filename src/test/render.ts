import { createPinia } from 'pinia'
import type { Component } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { render } from 'vitest-browser-vue'

import type { TimetablePort } from '@/application/ports/timetable'
import { RouteLibrary } from '@/application/route-library'
import { StopSearch } from '@/application/stop-search'
import { TripMonitor } from '@/application/trip-monitor'
import type { Route } from '@/domain/route'
import { CompressedRouteCodec } from '@/infrastructure/sharing/compressed-route-codec'
import { createAppI18n } from '@/ui/i18n'
import type { Locale } from '@/ui/i18n/locale'
import { createAppRouter } from '@/ui/router'
import { type AppServices, servicesKey } from '@/ui/services'

import { at } from './builders'
import { FakeClock, FakeScheduler, MemoryJourneyCache, MemoryRouteRepository } from './fakes'

export interface RenderOptions {
  readonly path?: string
  readonly locale?: Locale
  readonly props?: Record<string, unknown>
  /** Routes stored before the app starts. */
  readonly routes?: Route[]
  readonly timetable?: Partial<TimetablePort>
  /** Time of the app clock, 07:00 on Monday, 12 October 2026 by default. */
  readonly now?: number
}

const emptyTimetable: TimetablePort = {
  findJourneys: () => Promise.resolve([]),
  searchStops: () => Promise.resolve([]),
}

/** Services with in-memory adapters and a clock that only moves when a test moves it. */
export function testServices(options: RenderOptions = {}) {
  const timetable: TimetablePort = { ...emptyTimetable, ...options.timetable }
  const repository = new MemoryRouteRepository(options.routes)
  const clock = new FakeClock(options.now ?? at('07:00'))
  const scheduler = new FakeScheduler(clock)
  const cache = new MemoryJourneyCache()
  let nextId = 1
  const services: AppServices = {
    clock,
    timetable,
    routes: new RouteLibrary({ repository, createId: () => `route-${nextId++}` }),
    stops: new StopSearch(timetable),
    codec: new CompressedRouteCodec(),
    createTripMonitor: () => new TripMonitor({ timetable, cache, clock, scheduler }),
  }
  return { services, repository, clock, scheduler }
}

/**
 * Renders a component with the app's router, stores and translations, in German by default,
 * on top of in-memory services.
 */
export async function renderWithApp(component: Component, options: RenderOptions = {}) {
  const { services, repository, clock, scheduler } = testServices(options)
  const router = createAppRouter(createMemoryHistory())
  await router.push(options.path ?? '/')
  await router.isReady()

  const screen = await render(component, {
    props: options.props,
    global: {
      plugins: [router, createPinia(), createAppI18n(options.locale ?? 'de')],
      provide: { [servicesKey as symbol]: services },
    },
  })
  return { ...screen, router, services, repository, clock, scheduler }
}
