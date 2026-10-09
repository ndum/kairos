import { afterEach, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import type { TimetablePort } from '@/application/ports/timetable'
import { at, busLine, home, morningCommute, office, route, trainLine } from '@/test/builders'
import { renderWithApp } from '@/test/render'

import PlanView from './PlanView.vue'

const commute = route('commute', 'Commute', [home, office], [trainLine('S1'), busLine('20')])

function timetable() {
  const findJourneys = vi
    .fn<TimetablePort['findJourneys']>()
    .mockResolvedValue([morningCommute('07:20'), morningCommute('07:35'), morningCommute('07:50')])
  return { findJourneys }
}

afterEach(() => {
  localStorage.clear()
})

test('asks to set up a route first', async () => {
  const screen = await renderWithApp(PlanView, { path: '/plan' })

  await expect
    .element(screen.getByRole('heading', { name: 'Zuerst eine Route anlegen' }))
    .toBeVisible()
})

test('plans trips from the next five minutes and recommends the first one', async () => {
  const source = timetable()
  const screen = await renderWithApp(PlanView, {
    path: '/plan',
    routes: [commute],
    timetable: source,
  })

  await expect.element(screen.getByLabelText('Uhrzeit')).toHaveValue('07:00')
  const first = screen.getByRole('article', { name: /07:09/ })
  await expect.element(first).toMatchTextContent(/Empfohlen/)
  await expect.element(screen.getByRole('article', { name: /07:24/ })).toBeVisible()
  expect(source.findJourneys).toHaveBeenCalledWith(
    expect.objectContaining({ at: at('07:11') }),
    expect.any(AbortSignal),
  )
})

test('plans by the time of arrival', async () => {
  const source = timetable()
  const screen = await renderWithApp(PlanView, {
    path: '/plan',
    routes: [commute],
    timetable: source,
  })

  await screen.getByText('Ankunft bis').click()
  await userEvent.fill(screen.getByLabelText('Uhrzeit'), '07:50')

  await expect
    .poll(() => {
      const query = source.findJourneys.mock.lastCall?.[0]
      return query && { at: new Date(query.at).toISOString(), arriveBy: query.arriveBy }
    })
    .toEqual({ at: new Date(at('07:45')).toISOString(), arriveBy: true })
  // The commutes arrive at 07:43 and 07:58, so only the first one, leaving at 07:09, is in time.
  await expect
    .element(screen.getByRole('article', { name: /07:09/ }))
    .toMatchTextContent(/Empfohlen/)
  await expect.element(screen.getByRole('article', { name: /07:24/ })).not.toBeInTheDocument()
})

test('pins a trip and shows its details', async () => {
  const screen = await renderWithApp(PlanView, {
    path: '/plan',
    routes: [commute],
    timetable: timetable(),
  })
  const first = screen.getByRole('article', { name: /07:09/ })

  await first.getByRole('button', { name: 'Merken' }).click()

  await expect.element(first).toMatchTextContent(/Gemerkt/)
  expect(screen.services.pins.load()).toMatchObject({ routeId: 'commute', direction: 'outbound' })

  await first.getByRole('button', { name: 'Details' }).click()
  const sheet = screen.getByRole('dialog', { name: 'Losgehen um 07:09' })
  await expect.element(sheet).toMatchTextContent(/Umsteigen in Central, Bus Station/)
  await sheet.getByRole('button', { name: 'Nicht mehr merken' }).click()
  expect(screen.services.pins.load()).toBeNull()
})
