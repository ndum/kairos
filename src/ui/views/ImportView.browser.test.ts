import { expect, test } from 'vitest'
import { defineComponent, h } from 'vue'

import { CompressedRouteCodec } from '@/infrastructure/sharing/compressed-route-codec'
import { gym, home, office, route } from '@/test/builders'
import { renderWithApp } from '@/test/render'

import ToastHost from '../components/ToastHost.vue'
import ImportView from './ImportView.vue'

const WithToasts = defineComponent(() => () => [h(ImportView), h(ToastHost)])

const commute = route('commute', 'Commute', [home, office])
const training = route('training', 'Training', [home, gym])

async function linkPath(...routes: ReturnType<typeof route>[]): Promise<string> {
  return `/import?r=${await new CompressedRouteCodec().encode(routes)}`
}

test('shows what a link brings and adds the new and changed routes', async () => {
  const path = await linkPath(commute, { ...training, name: 'Gym' })
  const screen = await renderWithApp(ImportView, { path, routes: [training] })

  await expect.element(screen.getByRole('heading', { name: 'Routen übernehmen' })).toBeVisible()
  await expect.element(screen.getByText('Neu')).toBeVisible()
  await expect.element(screen.getByText('Wird aktualisiert')).toBeVisible()

  await screen.getByRole('button', { name: '2 Routen übernehmen' }).click()

  expect(screen.repository.routes).toEqual([{ ...training, name: 'Gym' }, commute])
  await expect.poll(() => screen.router.currentRoute.value.name).toBe('routes')
})

test('has nothing to add when the routes are already there', async () => {
  const screen = await renderWithApp(ImportView, {
    path: await linkPath(training),
    routes: [training],
  })

  await expect.element(screen.getByText('Schon vorhanden')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Nichts zu übernehmen' })).toBeDisabled()
})

test('confirms how many routes were added', async () => {
  const screen = await renderWithApp(WithToasts, { path: await linkPath(commute) })

  await screen.getByRole('button', { name: 'Route übernehmen' }).click()

  await expect.element(screen.getByText('Eine Route übernommen.')).toBeVisible()
})

test('explains a damaged link', async () => {
  const screen = await renderWithApp(ImportView, { path: '/import?r=damaged' })

  await expect.element(screen.getByRole('heading', { name: 'Link ungültig' })).toBeVisible()
})
