import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import type { TimetablePort } from '@/application/ports/timetable'
import { minutes } from '@/domain/time'
import { busLine, home, journey, morningCommute, office, ride, route, stop } from '@/test/builders'
import { renderWithApp } from '@/test/render'

import RouteEditorView from './RouteEditorView.vue'

const homeward = journey(
  ride('9', 'Market Square', '17:02', 'Riverside', '17:20', { mode: 'tram' }),
)

const timetable: Partial<TimetablePort> = {
  searchStops: (text) =>
    Promise.resolve([stop(text.startsWith('River') ? 'Riverside' : 'Market Square')]),
  findJourneys: ({ from }) =>
    Promise.resolve(from.id === 'Riverside' ? [morningCommute()] : [homeward]),
}

type Screen = Awaited<ReturnType<typeof renderWithApp>>

async function choosePlace(screen: Screen, name: string, stopText: string, stopName: string) {
  await screen.getByRole('button', { name, exact: true }).click()
  await userEvent.fill(screen.getByRole('combobox', { name: 'Haltestelle' }), stopText)
  await screen.getByRole('option', { name: stopName }).click()
}

test('creates a route in three steps', async () => {
  const screen = await renderWithApp(RouteEditorView, { path: '/routes/new', timetable })

  await expect.element(screen.getByRole('heading', { name: 'Wo startest du?' })).toBeVisible()
  await choosePlace(screen, 'Zuhause', 'River', 'Riverside')
  for (let step = 0; step < 3; step++) {
    await screen.getByRole('button', { name: 'Fussweg zur Haltestelle: eine Minute mehr' }).click()
  }
  await screen.getByRole('button', { name: 'Weiter' }).click()

  await expect.element(screen.getByRole('heading', { name: 'Wohin fährst du?' })).toHaveFocus()
  await choosePlace(screen, 'Arbeit', 'Market', 'Market Square')
  await screen.getByRole('button', { name: 'Weiter' }).click()

  await expect
    .element(screen.getByRole('heading', { name: 'Welche Linien nimmst du?' }))
    .toBeVisible()
  await expect
    .element(screen.getByText('Ohne Auswahl berücksichtigt Kairos alle Linien.'))
    .toBeVisible()
  await screen.getByRole('button', { name: 'S1 in einer Verbindung' }).click()
  await expect.element(screen.getByText(/Keine der nächsten Verbindungen/)).toBeVisible()
  await screen.getByRole('button', { name: '20 in einer Verbindung' }).click()
  await expect.element(screen.getByText('Passt zu 1 von 2 Verbindungen.')).toBeVisible()
  await screen.getByRole('button', { name: 'Puffer beim Losgehen: eine Minute mehr' }).click()
  await expect
    .element(screen.getByRole('textbox', { name: 'Name der Route' }))
    .toHaveValue('Zuhause ↔ Arbeit')
  await screen.getByRole('button', { name: 'Route speichern' }).click()

  expect(screen.repository.routes).toEqual([
    {
      id: 'route-1',
      name: 'Zuhause ↔ Arbeit',
      places: [
        { name: 'Zuhause', stop: stop('Riverside'), walk: minutes(8) },
        { name: 'Arbeit', stop: stop('Market Square'), walk: minutes(5) },
      ],
      buffer: minutes(4),
      preferredLines: [
        { name: 'S1', mode: 'train' },
        { name: '20', mode: 'bus' },
      ],
    },
  ])
  await expect.poll(() => screen.router.currentRoute.value.name).toBe('routes')
})

test('asks for the missing details before moving on', async () => {
  const screen = await renderWithApp(RouteEditorView, { path: '/routes/new', timetable })

  await screen.getByRole('button', { name: 'Weiter' }).click()

  await expect.element(screen.getByText('Gib einen Namen ein.')).toBeVisible()
  await expect.element(screen.getByText('Wähle eine Haltestelle aus der Liste.')).toBeVisible()
  await expect.element(screen.getByRole('textbox', { name: 'Name des Ortes' })).toHaveFocus()
  await expect.element(screen.getByRole('heading', { name: 'Wo startest du?' })).toBeVisible()
})

test('edits an existing route and keeps its id', async () => {
  const commute = route('commute', 'Commute', [home, office], [busLine('20')])
  const screen = await renderWithApp(RouteEditorView, {
    path: '/routes/commute',
    props: { id: 'commute' },
    routes: [commute],
    timetable,
  })

  await expect.element(screen.getByRole('heading', { name: 'Route bearbeiten' })).toBeVisible()
  await expect
    .element(screen.getByRole('combobox', { name: 'Haltestelle' }))
    .toHaveValue('Riverside')
  await screen.getByRole('button', { name: 'Linien' }).click()
  await userEvent.fill(screen.getByRole('textbox', { name: 'Name der Route' }), 'Work')
  await screen.getByRole('button', { name: 'Route speichern' }).click()

  expect(screen.repository.routes).toEqual([{ ...commute, name: 'Work' }])
})

test('explains when the route to edit no longer exists', async () => {
  const screen = await renderWithApp(RouteEditorView, {
    path: '/routes/gone',
    props: { id: 'gone' },
  })

  await expect.element(screen.getByRole('heading', { name: 'Route nicht gefunden' })).toBeVisible()
})
