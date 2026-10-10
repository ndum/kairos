import { afterEach, expect, test } from 'vitest'

import { pinTrip } from '@/application/pinned-trip'
import type { TimetablePort } from '@/application/ports/timetable'
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

test('shows the connection step by step and the trips after it', async () => {
  const screen = await renderWithApp(NowView, { routes: [commute], timetable: timetable(morning) })

  const connection = screen.getByRole('region', { name: 'Deine Verbindung' })
  await expect.element(connection.getByText('Umsteigen in Central, Bus Station')).toBeVisible()
  await expect.element(connection.getByText('4 Min. Fussweg, 1 Min. zum Umsteigen')).toBeVisible()

  const later = screen.getByRole('region', { name: 'Danach' })
  await expect.element(later).toMatchTextContent(/07:24.*07:39/)
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
  await expect
    .element(screen.getByRole('region', { name: /Home nach Office/ }))
    .toMatchTextContent(/Richtung wechseln/)
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
  await expect.element(hero.getByText('Richtung nach Standort')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Richtung wechseln' })).toBeVisible()
})

test('tells when the position is missing and the time of day decides', async () => {
  localStorage.setItem('kairos:location', 'true')

  const screen = await renderWithApp(NowView, {
    routes: [located],
    timetable: timetable(morning),
    location: { kind: 'unavailable' },
  })

  const hero = screen.getByRole('region', { name: /Home nach Office/ })
  await expect
    .element(hero.getByText('Standort nicht gefunden, Richtung nach Uhrzeit'))
    .toBeVisible()
})

test('says nothing about the direction while the location is off', async () => {
  const screen = await renderWithApp(NowView, { routes: [located], timetable: timetable(morning) })

  const hero = screen.getByRole('region', { name: /Home nach Office/ })
  await expect.element(hero).toMatchTextContent(/Losgehen/)
  expect(hero.getByText(/Richtung nach/).query()).toBeNull()
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
