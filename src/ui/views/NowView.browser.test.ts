import { afterEach, expect, test } from 'vitest'

import type { TimetablePort } from '@/application/ports/timetable'
import type { Journey } from '@/domain/journey'
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

  // The S1 at 07:20 leaves 8 minutes of walking and 3 minutes of reserve: leave at 07:09.
  await expect.element(hero).toMatchTextContent(/Losgehen in\s*9\s*Min\./)
  await expect.element(hero.getByText('Genug Zeit')).toBeVisible()
  await expect.element(hero.getByText('07:20')).toBeVisible()
  await expect.element(screen.getByRole('status').filter({ hasText: /^Live$/ })).toBeInTheDocument()
})

test('shows the connection step by step and the trips after it', async () => {
  const screen = await renderWithApp(NowView, { routes: [commute], timetable: timetable(morning) })

  const connection = screen.getByRole('region', { name: 'Deine Verbindung' })
  await expect.element(connection.getByText('Umsteigen in Central, Bus Station')).toBeVisible()
  await expect.element(connection.getByText('4 Min. Fussweg, 1 Min. zum Umsteigen')).toBeVisible()

  const later = screen.getByRole('region', { name: 'Danach' })
  await expect.element(later).toMatchTextContent(/07:24.*07:39/)
})

test('warns about an earlier trip that is only reachable without the reserve', async () => {
  const screen = await renderWithApp(NowView, {
    routes: [commute],
    timetable: timetable([morningCommute('07:10'), ...morning]),
  })

  await expect
    .element(screen.getByText(/Ohne Reserve noch erreichbar: Abfahrt 07:10, losgehen in 2 Min\./))
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
  await expect
    .element(screen.getByRole('region', { name: /Home nach Office/ }))
    .toMatchTextContent(/Richtung wechseln/)
})

test('starts with the direction from the place the device is at', async () => {
  const atOffice = { latitude: 46.95, longitude: 7.45 }
  const located = route('located', 'Commute', [
    { ...home, stop: { ...home.stop, coordinates: { latitude: 46.8, longitude: 7.5 } } },
    { ...office, stop: { ...office.stop, coordinates: atOffice } },
  ])
  localStorage.setItem('kairos:location', 'true')

  const screen = await renderWithApp(NowView, {
    routes: [located],
    timetable: timetable(morning),
    location: { kind: 'found', coordinates: atOffice },
  })

  // In the morning the board would start at home, but the device is at the office.
  await expect
    .element(screen.getByRole('region', { name: /Office nach Home/ }))
    .toMatchTextContent(/Losgehen/)
  await expect.element(screen.getByRole('button', { name: 'Richtung wechseln' })).toBeVisible()
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
