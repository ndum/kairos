import { afterEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import type { TimetablePort } from '@/application/ports/timetable'
import { minutes } from '@/domain/time'
import { busLine, home, journey, morningCommute, office, ride, route, stop } from '@/test/builders'
import { renderWithApp } from '@/test/render'

import RouteEditorView from './RouteEditorView.vue'

afterEach(() => {
  localStorage.clear()
})

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
  await expect
    .element(screen.getByRole('button', { name: 'Schritt 1: Start' }))
    .toHaveAttribute('aria-current', 'step')
  await expect.element(screen.getByRole('button', { name: 'Schritt 3: Verbindung' })).toBeDisabled()
  await choosePlace(screen, 'Zuhause', 'River', 'Riverside')
  for (let step = 0; step < 3; step++) {
    await screen.getByRole('button', { name: 'Fussweg zur Haltestelle: eine Minute mehr' }).click()
  }
  await screen.getByRole('button', { name: 'Weiter' }).click()

  await expect.element(screen.getByRole('heading', { name: 'Wohin fährst du?' })).toHaveFocus()
  await choosePlace(screen, 'Arbeit', 'Market', 'Market Square')
  await screen.getByRole('button', { name: 'Weiter' }).click()

  await expect
    .element(screen.getByRole('heading', { name: 'Welche Verbindung nimmst du?' }))
    .toBeVisible()
  await expect.element(screen.getByRole('radio', { name: /Immer die schnellste/ })).toBeChecked()
  await screen.getByRole('radio', { name: /S1\s*dann\s*20/ }).click()
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
  await expect
    .element(screen.getByRole('heading', { name: '«Zuhause ↔ Arbeit» ist bereit' }))
    .toHaveFocus()
  await screen.getByRole('button', { name: 'Zu «Jetzt»' }).click()
  await expect.poll(() => screen.router.currentRoute.value.name).toBe('now')
  expect(localStorage.getItem('kairos:route')).toBe('route-1')
})

test('starts over for another route right after saving one', async () => {
  const screen = await renderWithApp(RouteEditorView, { path: '/routes/new', timetable })

  await choosePlace(screen, 'Zuhause', 'River', 'Riverside')
  await screen.getByRole('button', { name: 'Weiter' }).click()
  await choosePlace(screen, 'Arbeit', 'Market', 'Market Square')
  await screen.getByRole('button', { name: 'Weiter' }).click()
  await screen.getByRole('button', { name: 'Route speichern' }).click()
  await screen.getByRole('button', { name: 'Weitere Route anlegen' }).click()

  await expect.element(screen.getByRole('heading', { name: 'Wo startest du?' })).toHaveFocus()
  await expect.element(screen.getByRole('textbox', { name: 'Name des Ortes' })).toHaveValue('')
  expect(screen.repository.routes).toHaveLength(1)
})

test('lets the user pick own lines one by one', async () => {
  const screen = await renderWithApp(RouteEditorView, { path: '/routes/new', timetable })

  await choosePlace(screen, 'Zuhause', 'River', 'Riverside')
  await screen.getByRole('button', { name: 'Weiter' }).click()
  await choosePlace(screen, 'Arbeit', 'Market', 'Market Square')
  await screen.getByRole('button', { name: 'Weiter' }).click()

  await screen.getByRole('radio', { name: /Eigene Linien wählen/ }).click()
  await screen.getByRole('button', { name: 'S1 in einer Verbindung' }).click()

  await expect.element(screen.getByText(/Keine der nächsten Verbindungen/)).toBeVisible()
  await expect.element(screen.getByRole('radio', { name: /Eigene Linien wählen/ })).toBeChecked()
})

test('asks for the missing details before moving on', async () => {
  const screen = await renderWithApp(RouteEditorView, { path: '/routes/new', timetable })

  await screen.getByRole('button', { name: 'Weiter' }).click()

  await expect.element(screen.getByText('Gib einen Namen ein.')).toBeVisible()
  await expect.element(screen.getByText('Wähle eine Haltestelle aus der Liste.')).toBeVisible()
  await expect.element(screen.getByRole('textbox', { name: 'Name des Ortes' })).toHaveFocus()
  await expect.element(screen.getByRole('heading', { name: 'Wo startest du?' })).toBeVisible()
})

test('edits an existing route on one page and keeps its id', async () => {
  const commute = route('commute', 'Commute', [home, office], [busLine('20')])
  const screen = await renderWithApp(RouteEditorView, {
    path: '/routes/commute',
    props: { id: 'commute' },
    routes: [commute],
    timetable,
  })

  await expect.element(screen.getByRole('heading', { name: 'Route bearbeiten' })).toBeVisible()
  await expect
    .element(
      screen.getByRole('region', { name: 'Start' }).getByRole('combobox', { name: 'Haltestelle' }),
    )
    .toHaveValue('Riverside')
  await expect
    .element(
      screen.getByRole('region', { name: 'Ziel' }).getByRole('combobox', { name: 'Haltestelle' }),
    )
    .toHaveValue('Market Square')
  await userEvent.fill(screen.getByRole('textbox', { name: 'Name der Route' }), 'Work')
  await screen.getByRole('button', { name: 'Route speichern' }).click()

  expect(screen.repository.routes).toEqual([{ ...commute, name: 'Work' }])
})

test('sets the schedule of a route and copies Monday to the other weekdays', async () => {
  const commute = route('commute', 'Commute', [home, office])
  const screen = await renderWithApp(RouteEditorView, {
    path: '/routes/commute',
    props: { id: 'commute' },
    routes: [commute],
    timetable,
  })
  const schedule = screen.getByRole('region', { name: 'Stundenplan' })

  await userEvent.fill(schedule.getByRole('textbox', { name: 'Montag: Ankunft bis' }), '07:45')
  await userEvent.fill(schedule.getByLabelText('Montag: Rückweg ab'), '16:30')
  await schedule.getByRole('button', { name: 'Montag für Dienstag bis Freitag übernehmen' }).click()
  await expect.element(schedule.getByLabelText('Freitag: Rückweg ab')).toHaveValue('16:30')
  await screen.getByRole('button', { name: 'Route speichern' }).click()

  const day = { arriveBy: 7 * 60 + 45, returnFrom: 16 * 60 + 30 }
  expect(screen.repository.routes[0]?.schedule).toEqual(
    [1, 2, 3, 4, 5].map((weekday) => ({ weekday, ...day })),
  )
})

test('refuses a way back that starts before the arrival', async () => {
  const commute = route('commute', 'Commute', [home, office])
  const screen = await renderWithApp(RouteEditorView, {
    path: '/routes/commute',
    props: { id: 'commute' },
    routes: [commute],
    timetable,
  })

  await userEvent.fill(screen.getByLabelText('Dienstag: Ankunft bis'), '10:00')
  await userEvent.fill(screen.getByLabelText('Dienstag: Rückweg ab'), '09:00')
  await screen.getByRole('button', { name: 'Route speichern' }).click()

  await expect.element(screen.getByText('Der Rückweg beginnt vor der Ankunft.')).toBeVisible()
  expect(screen.repository.routes).toEqual([commute])
})

test('keeps the schedule closed in the assistant until the user opens it', async () => {
  const screen = await renderWithApp(RouteEditorView, { path: '/routes/new', timetable })

  await choosePlace(screen, 'Zuhause', 'River', 'Riverside')
  await screen.getByRole('button', { name: 'Weiter' }).click()
  await choosePlace(screen, 'Arbeit', 'Market', 'Market Square')
  await screen.getByRole('button', { name: 'Weiter' }).click()

  const toggle = screen.getByRole('button', { name: 'Stundenplan' })
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect.element(screen.getByLabelText('Montag: Ankunft bis')).not.toBeVisible()

  await toggle.click()
  await userEvent.fill(screen.getByLabelText('Montag: Ankunft bis'), '08:00')
  await screen.getByRole('button', { name: 'Route speichern' }).click()

  expect(screen.repository.routes[0]?.schedule).toEqual([
    { weekday: 1, arriveBy: 8 * 60, returnFrom: null },
  ])
})

test('adds a second stop to a place', async () => {
  const commute = route('commute', 'Commute', [home, office])
  const screen = await renderWithApp(RouteEditorView, {
    path: '/routes/commute',
    props: { id: 'commute' },
    routes: [commute],
    timetable: { ...timetable, searchStops: () => Promise.resolve([stop('Riverside, Bus Stop')]) },
  })
  const start = screen.getByRole('region', { name: 'Start' })

  await start.getByRole('button', { name: 'Zweite Haltestelle hinzufügen' }).click()
  await userEvent.fill(start.getByRole('combobox', { name: 'Zweite Haltestelle' }), 'Bus')
  await screen.getByRole('option', { name: 'Riverside, Bus Stop' }).click()
  await start
    .getByRole('button', { name: 'Fussweg zur zweiten Haltestelle: eine Minute weniger' })
    .click()
  await screen.getByRole('button', { name: 'Route speichern' }).click()

  expect(screen.repository.routes[0]?.places[0].secondStop).toEqual({
    stop: stop('Riverside, Bus Stop'),
    walk: minutes(4),
  })
})

test('shows every missing detail of the route being edited', async () => {
  const commute = route('commute', 'Commute', [home, office])
  const screen = await renderWithApp(RouteEditorView, {
    path: '/routes/commute',
    props: { id: 'commute' },
    routes: [commute],
    timetable,
  })

  await userEvent.fill(screen.getByRole('textbox', { name: 'Name der Route' }), ' ')
  await userEvent.fill(
    screen.getByRole('region', { name: 'Ziel' }).getByRole('textbox', { name: 'Name des Ortes' }),
    '',
  )
  await screen.getByRole('button', { name: 'Route speichern' }).click()

  await expect.element(screen.getByText('Gib einen Namen ein.').first()).toBeVisible()
  expect(screen.getByText('Gib einen Namen ein.').elements()).toHaveLength(2)
  expect(screen.repository.routes).toEqual([commute])
})

test('explains when the route to edit no longer exists', async () => {
  const screen = await renderWithApp(RouteEditorView, {
    path: '/routes/gone',
    props: { id: 'gone' },
  })

  await expect.element(screen.getByRole('heading', { name: 'Route nicht gefunden' })).toBeVisible()
})
