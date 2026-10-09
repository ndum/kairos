import { expect, test } from 'vitest'

import { renderWithApp } from '@/test/render'

import NowView from './NowView.vue'

test('invites the user to add a first route', async () => {
  const screen = await renderWithApp(NowView)

  await expect.element(screen.getByRole('heading', { name: 'Noch keine Route' })).toBeVisible()

  await screen.getByRole('link', { name: 'Route anlegen' }).click()
  await expect.poll(() => screen.router.currentRoute.value.name).toBe('route-new')
})
