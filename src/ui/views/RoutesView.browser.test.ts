import { expect, test } from 'vitest'
import { defineComponent, h } from 'vue'

import { busLine, gym, home, office, route, trainLine } from '@/test/builders'
import { renderWithApp } from '@/test/render'

import ToastHost from '../components/ToastHost.vue'
import RoutesView from './RoutesView.vue'

const commute = route('commute', 'Commute', [home, office], [trainLine('S1'), busLine('20')])
const training = route('training', 'Training', [home, gym])

const WithToasts = defineComponent(() => () => [h(RoutesView), h(ToastHost)])

test('invites the user to add a first route', async () => {
  const screen = await renderWithApp(RoutesView, { path: '/routes' })

  await expect
    .element(screen.getByRole('heading', { name: 'Hier entstehen deine Routen' }))
    .toBeVisible()
  await screen.getByRole('link', { name: 'Route anlegen' }).click()
  await expect.poll(() => screen.router.currentRoute.value.name).toBe('route-new')
})

test('shows each route with its places and lines', async () => {
  const screen = await renderWithApp(RoutesView, { path: '/routes', routes: [commute, training] })
  const card = screen.getByRole('article', { name: 'Commute' })

  await expect.element(card.getByText('Riverside')).toBeVisible()
  await expect.element(card.getByText('8 Min. zu Fuss, 3 Min. Reserve')).toBeVisible()
  await expect.element(card.getByText('S1')).toBeVisible()
  await expect
    .element(screen.getByRole('article', { name: 'Training' }).getByText('Alle Linien'))
    .toBeVisible()
})

test('changes the order of the routes', async () => {
  const screen = await renderWithApp(RoutesView, { path: '/routes', routes: [commute, training] })

  await expect
    .element(screen.getByRole('button', { name: '«Commute» nach oben verschieben' }))
    .toBeDisabled()
  await screen.getByRole('button', { name: '«Commute» nach unten verschieben' }).click()

  await expect
    .poll(() => screen.repository.routes.map(({ id }) => id))
    .toEqual(['training', 'commute'])
})

test('deletes a route and brings it back on request', async () => {
  const screen = await renderWithApp(WithToasts, { path: '/routes', routes: [commute, training] })

  await screen.getByRole('button', { name: '«Commute» löschen' }).click()
  await expect.element(screen.getByText('«Commute» gelöscht.')).toBeVisible()
  expect(screen.repository.routes).toEqual([training])

  await screen.getByRole('button', { name: 'Rückgängig' }).click()
  await expect.element(screen.getByRole('article', { name: 'Commute' })).toBeVisible()
  expect(screen.repository.routes).toEqual([commute, training])
})

test('warns when the routes cannot be stored on the device', async () => {
  const screen = await renderWithApp(RoutesView, { path: '/routes', routes: [commute] })
  screen.repository.failing = true

  await screen.getByRole('button', { name: '«Commute» löschen' }).click()

  await expect.element(screen.getByRole('alert')).toMatchTextContent(/keine Daten speichern/)
})
