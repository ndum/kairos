import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { PlaceFinder } from './application/place-finder'
import { RouteLibrary } from './application/route-library'
import { StopSearch } from './application/stop-search'
import { TripMonitor } from './application/trip-monitor'
import { WeatherForecasts } from './application/weather-forecasts'
import { BrowserLocation } from './infrastructure/browser/browser-location'
import { LocalStorageJourneyCache } from './infrastructure/browser/local-storage-journey-cache'
import { LocalStoragePinStore } from './infrastructure/browser/local-storage-pin-store'
import { LocalStorageRouteRepository } from './infrastructure/browser/local-storage-route-repository'
import { randomId } from './infrastructure/browser/random-id'
import { systemClock } from './infrastructure/browser/system-clock'
import { timerScheduler } from './infrastructure/browser/timer-scheduler'
import { OpenMeteoWeather } from './infrastructure/open-meteo/open-meteo-weather'
import { CompressedRouteCodec } from './infrastructure/sharing/compressed-route-codec'
import { SwisstopoAddressSearch } from './infrastructure/swisstopo/swisstopo-address-search'
import { TransportOpendataTimetable } from './infrastructure/transport-opendata/transport-opendata-timetable'
import App from './ui/App.vue'
import { createAppI18n, loadLocale } from './ui/i18n'
import { createAppRouter } from './ui/router'
import { type AppServices, servicesKey } from './ui/services'
import './ui/styles/main.css'

// Composition root: the only place that knows the concrete adapters.
const timetable = new TransportOpendataTimetable()
const cache = new LocalStorageJourneyCache()
const services: AppServices = {
  clock: systemClock,
  timetable,
  routes: new RouteLibrary({ repository: new LocalStorageRouteRepository(), createId: randomId }),
  stops: new StopSearch(timetable),
  places: new PlaceFinder({
    addresses: new SwisstopoAddressSearch(),
    companies: timetable,
    timetable,
  }),
  codec: new CompressedRouteCodec(),
  location: new BrowserLocation(),
  pins: new LocalStoragePinStore(),
  weather: new WeatherForecasts({ weather: new OpenMeteoWeather(), clock: systemClock }),
  createTripMonitor: () =>
    new TripMonitor({ timetable, cache, clock: systemClock, scheduler: timerScheduler }),
}

// The language of the device may have to load first, so the app starts in it right away.
const i18n = createAppI18n()
await loadLocale(i18n.global, i18n.global.locale.value)

createApp(App)
  .provide(servicesKey, services)
  .use(createPinia())
  .use(createAppRouter())
  .use(i18n)
  .mount('#app')
