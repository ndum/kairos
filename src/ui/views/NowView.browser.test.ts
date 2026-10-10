import { afterEach, describe, expect, test, vi } from 'vitest'

import { pinTrip } from '@/application/pinned-trip'
import type { TimetablePort } from '@/application/ports/timetable'
import type { WeatherPort } from '@/application/ports/weather'
import type { Journey } from '@/domain/journey'
import { endpoints } from '@/domain/route'
import { planTrip } from '@/domain/trip'
import {
  at,
  busLine,
  home,
  journey,
  morningCommute,
  office,
  ride,
  route,
  trainLine,
  walk,
} from '@/test/builders'
import { renderWithApp } from '@/test/render'
import { useTitleStore } from '@/ui/stores/title'

import NowView from './NowView.vue'

const commute = route('commute', 'Commute', [home, office], [trainLine('S1'), busLine('20')])

/** Bus 20 and S2 back home. */
const homeward = (departure: string, arrival: string): Journey =>
  journey(
    ride('20', 'Market Square', departure, 'Central, Bus Station', arrival, { mode: 'bus' }),
    walk('Central, Bus Station', 'Central', 4),
    ride('S2', 'Central', '17:20', 'Riverside', '17:29'),
  )

function timetable(outbound: Journey[]): Partial<TimetablePort> {
  return {
    findJourneys: ({ from }) =>
      Promise.resolve(from.id === home.stop.id ? outbound : [homeward('17:02', '17:07')]),
  }
}

const morning = [morningCommute('07:20'), morningCommute('07:35'), morningCommute('07:50')]

afterEach(() => {
  localStorage.clear()
})

test('invites the user to add a first route', async () => {
  const screen = await renderWithApp(NowView)

  await expect.element(screen.getByRole('heading', { name: 'Noch keine Route' })).toBeVisible()

  await screen.getByRole('link', { name: 'Route anlegen' }).click()
  await expect.poll(() => screen.router.currentRoute.value.name).toBe('route-new')
})

test('counts down to leaving for the next trip', async () => {
  const screen = await renderWithApp(NowView, { routes: [commute], timetable: timetable(morning) })
  const hero = screen.getByRole('region', { name: /Home nach Office/ })

  // The S1 at 07:20 leaves 8 minutes of walking and 3 minutes of buffer: leave at 07:09.
  await expect.element(hero).toMatchTextContent(/Losgehen in\s*9\s*Min\./)
  await expect.element(hero.getByText('Genug Zeit')).toBeVisible()
  await expect.element(hero.getByText('07:20')).toBeVisible()
  await expect.element(screen.getByRole('status').filter({ hasText: /^Live$/ })).toBeInTheDocument()
})

test('puts the time until leaving into the page title and on the app icon', async () => {
  const setAppBadge = vi.fn(() => Promise.resolve())
  const clearAppBadge = vi.fn(() => Promise.resolve())
  Object.defineProperty(navigator, 'setAppBadge', { configurable: true, value: setAppBadge })
  Object.defineProperty(navigator, 'clearAppBadge', { configurable: true, value: clearAppBadge })
  try {
    const screen = await renderWithApp(NowView, {
      routes: [commute],
      timetable: timetable(morning),
    })
    const title = useTitleStore()

    await expect.poll(() => title.status).toBe('Losgehen in 9 Min.')
    expect(setAppBadge).toHaveBeenLastCalledWith(9)

    await screen.unmount()
    expect(title.status).toBeNull()
    expect(clearAppBadge).toHaveBeenCalled()
  } finally {
    Reflect.deleteProperty(navigator, 'setAppBadge')
    Reflect.deleteProperty(navigator, 'clearAppBadge')
  }
})

test('shows the connection step by step and the trips after it', async () => {
  const screen = await renderWithApp(NowView, { routes: [commute], timetable: timetable(morning) })

  const connection = screen.getByRole('region', { name: 'Deine Verbindung' })
  await expect.element(connection.getByText('Umsteigen in Central, Bus Station')).toBeVisible()
  await expect.element(connection.getByText('4 Min. Fussweg, 1 Min. zum Umsteigen')).toBeVisible()

  const later = screen.getByRole('region', { name: 'Danach' })
  await expect.element(later).toMatchTextContent(/07:24.*07:39/)
})

test('opens the details of a later trip and pins it', async () => {
  const screen = await renderWithApp(NowView, { routes: [commute], timetable: timetable(morning) })

  await screen
    .getByRole('region', { name: 'Danach' })
    .getByRole('button', { name: /07:24/ })
    .click()

  const sheet = screen.getByRole('dialog', { name: 'Losgehen um 07:24' })
  await expect.element(sheet.getByText('ab Riverside')).toBeVisible()
  await sheet.getByRole('button', { name: 'Merken' }).click()

  await expect.element(screen.getByRole('region', { name: 'Gemerkte Fahrt' })).toBeVisible()
})

test('lets the route prefer the lines of a trip from its details', async () => {
  const open = route('open', 'Commute', [home, office])
  const screen = await renderWithApp(NowView, { routes: [open], timetable: timetable(morning) })

  await screen
    .getByRole('region', { name: 'Danach' })
    .getByRole('button', { name: /07:24/ })
    .click()
  await screen.getByRole('button', { name: 'Diese Linien bevorzugen' }).click()

  expect(screen.repository.routes[0]?.preferredLines).toEqual([trainLine('S1'), busLine('20')])
  await expect
    .element(screen.getByRole('button', { name: 'Diese Linien bevorzugen' }))
    .not.toBeInTheDocument()
})

test('opens the details of the next trip back', async () => {
  // Back on the preferred lines, so the trip counts for the board.
  const back = journey(
    ride('20', 'Market Square', '07:30', 'Central, Bus Station', '07:35', { mode: 'bus' }),
    walk('Central, Bus Station', 'Central', 4),
    ride('S1', 'Central', '07:45', 'Riverside', '07:54'),
  )
  const screen = await renderWithApp(NowView, {
    routes: [commute],
    timetable: {
      findJourneys: ({ from }) => Promise.resolve(from.id === home.stop.id ? morning : [back]),
    },
  })

  await screen
    .getByRole('region', { name: /Office nach Home/ })
    .getByRole('button', { name: /Nächste: losgehen/ })
    .click()

  const sheet = screen.getByRole('dialog', { name: 'Losgehen um 07:22' })
  await expect.element(sheet.getByText('ab Market Square')).toBeVisible()
})

test('follows the schedule of the day: the latest trip in time and the earlier ones', async () => {
  const schooldays = {
    ...commute,
    schedule: [{ weekday: 1, arriveBy: 8 * 60, returnFrom: 16 * 60 + 30 }],
  } as const
  const screen = await renderWithApp(NowView, {
    routes: [schooldays],
    timetable: timetable(morning),
  })
  const hero = screen.getByRole('region', { name: /Home nach Office/ })

  // The S1 at 07:35 arrives at the office at 07:58, the one at 07:50 would be too late.
  await expect.element(hero).toMatchTextContent(/Losgehen in\s*24\s*Min\./)
  await expect.element(hero.getByText('Rechtzeitig für 08:00')).toBeVisible()
  await expect.element(screen.getByText('Richtung nach Stundenplan')).toBeVisible()
  const earlier = screen.getByRole('region', { name: 'Früher' })
  await expect.element(earlier.getByText('07:09')).toBeVisible()
})

describe('weather', () => {
  // The stops get positions, because the forecast is asked for at the stops.
  const located = route(
    'commute',
    'Commute',
    [
      { ...home, stop: { ...home.stop, coordinates: { latitude: 47.48, longitude: 7.73 } } },
      { ...office, stop: { ...office.stop, coordinates: { latitude: 47.56, longitude: 7.6 } } },
    ],
    [trainLine('S1'), busLine('20')],
  )
  const quarter = (time: string, precipitation: number, sky: 'cloudy' | 'rain') => ({
    at: at(time),
    temperature: 8.4,
    precipitation,
    sky,
    isDay: true,
  })
  const weather: WeatherPort = {
    forecast: () => Promise.resolve([quarter('07:00', 0, 'cloudy'), quarter('07:15', 0.5, 'rain')]),
  }

  test('shows the weather when leaving and warns about rain on the walk', async () => {
    const screen = await renderWithApp(NowView, {
      routes: [located],
      timetable: timetable(morning),
      weather,
    })
    const hero = screen.getByRole('region', { name: /Home nach Office/ })

    // Leaving at 07:09 for the S1 at 07:20, the rain starts at 07:15.
    await expect
      .element(hero.getByRole('img', { name: 'Wetter beim Losgehen: bewölkt, 8 Grad' }))
      .toBeVisible()
    await expect
      .element(hero.getByText('Gegen 07:15 regnet es auf dem Fussweg zur Haltestelle.'))
      .toBeVisible()
  })

  test('asks for no weather once the user switched it off', async () => {
    localStorage.setItem('kairos:weather', 'false')
    const forecast = vi.fn<WeatherPort['forecast']>(() => Promise.resolve([]))
    const screen = await renderWithApp(NowView, {
      routes: [located],
      timetable: timetable(morning),
      weather: { forecast },
    })

    await expect
      .element(screen.getByRole('region', { name: /Home nach Office/ }))
      .toMatchTextContent(/Losgehen in/)
    expect(forecast).not.toHaveBeenCalled()
    expect(screen.getByRole('img', { name: /Wetter beim Losgehen/ }).elements()).toHaveLength(0)
  })
})

test('warns about an earlier trip that is only reachable without the buffer', async () => {
  const screen = await renderWithApp(NowView, {
    routes: [commute],
    timetable: timetable([morningCommute('07:10'), ...morning]),
  })

  await expect
    .element(screen.getByText(/Ohne Puffer noch erreichbar: Abfahrt 07:10, losgehen in 2 Min\./))
    .toBeVisible()
})

test('shows the clock time when leaving is more than 90 minutes away', async () => {
  const screen = await renderWithApp(NowView, {
    routes: [commute],
    timetable: timetable([morningCommute('09:20')]),
    now: at('07:00'),
  })

  await expect
    .element(screen.getByRole('region', { name: /Home nach Office/ }))
    .toMatchTextContent(/Losgehen um\s*09:09/)
})

test('switches to the other direction', async () => {
  const screen = await renderWithApp(NowView, { routes: [commute], timetable: timetable(morning) })

  await screen.getByRole('button', { name: 'Richtung wechseln' }).click()

  await expect.element(screen.getByRole('region', { name: /Office nach Home/ })).toBeVisible()
  await expect.element(screen.getByRole('region', { name: /Home nach Office/ })).toBeVisible()
  await expect
    .element(
      screen
        .getByRole('region', { name: /Home nach Office/ })
        .getByRole('button', { name: 'Richtung wechseln' }),
    )
    .toBeVisible()
})

const atOffice = { latitude: 47.5635, longitude: 7.5996 }
const located = route('located', 'Commute', [
  { ...home, stop: { ...home.stop, coordinates: { latitude: 47.4845, longitude: 7.7314 } } },
  { ...office, stop: { ...office.stop, coordinates: atOffice } },
])

test('starts with the direction from the place the device is at', async () => {
  localStorage.setItem('kairos:location', 'true')

  const screen = await renderWithApp(NowView, {
    routes: [located],
    timetable: timetable(morning),
    location: { kind: 'found', coordinates: atOffice },
  })

  // In the morning the board would start at home, but the device is at the office.
  const hero = screen.getByRole('region', { name: /Office nach Home/ })
  await expect.element(hero).toMatchTextContent(/Losgehen/)
  await expect.element(screen.getByText('Richtung nach Standort')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Richtung wechseln' })).toBeVisible()
})

test('tells when the position is missing and the time of day decides', async () => {
  localStorage.setItem('kairos:location', 'true')

  const screen = await renderWithApp(NowView, {
    routes: [located],
    timetable: timetable(morning),
    location: { kind: 'unavailable' },
  })

  await expect.element(screen.getByRole('region', { name: /Home nach Office/ })).toBeVisible()
  await expect
    .element(screen.getByText('Standort nicht gefunden, Richtung nach Uhrzeit'))
    .toBeVisible()
})

test('says nothing about the direction while the location is off', async () => {
  const screen = await renderWithApp(NowView, { routes: [located], timetable: timetable(morning) })

  const hero = screen.getByRole('region', { name: /Home nach Office/ })
  await expect.element(hero).toMatchTextContent(/Losgehen/)
  expect(screen.getByText(/Richtung nach/).query()).toBeNull()
})

test('offers to try again when the timetable cannot be reached', async () => {
  let attempts = 0
  const screen = await renderWithApp(NowView, {
    routes: [commute],
    timetable: {
      findJourneys: () => {
        attempts++
        return attempts <= 2 ? Promise.reject(new Error('Offline')) : Promise.resolve(morning)
      },
    },
  })

  await expect.element(screen.getByText('Der Fahrplan ist gerade nicht erreichbar.')).toBeVisible()
  await screen.getByRole('button', { name: 'Erneut versuchen' }).click()

  await expect
    .element(screen.getByRole('region', { name: /Home nach Office/ }))
    .toMatchTextContent(/9\s*Min\./)
})

test('counts down to a pinned trip and forgets it on request', async () => {
  const later = planTrip(morningCommute('07:50'), endpoints(commute, 'outbound'))
  if (!later) throw new Error('Expected a trip')
  const screen = await renderWithApp(NowView, {
    routes: [commute],
    timetable: timetable(morning),
    pinned: pinTrip(commute, 'outbound', later),
  })
  const pinned = screen.getByRole('region', { name: 'Gemerkte Fahrt' })

  // The S1 at 07:50 leaves eleven minutes earlier, at 07:39.
  await expect.element(pinned).toMatchTextContent(/Losgehen in\s*39\s*Min\./)

  await pinned.getByRole('button', { name: 'Nicht mehr merken' }).click()
  await expect.element(pinned).not.toBeInTheDocument()
  expect(screen.services.pins.load()).toBeNull()
})
