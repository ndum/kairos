import { expect, test } from 'vitest'

import { renderWithApp } from '@/test/render'

import AppTabBar from './AppTabBar.vue'

test('links to the three areas and marks the current one', async () => {
  const screen = await renderWithApp(AppTabBar, { path: '/plan' })
  const navigation = screen.getByRole('navigation', { name: 'Hauptnavigation' })

  await expect.element(navigation.getByRole('link', { name: 'Jetzt' })).toBeVisible()
  await expect.element(navigation.getByRole('link', { name: 'Routen' })).toBeVisible()
  await expect
    .element(navigation.getByRole('link', { name: 'Planen' }))
    .toHaveAttribute('aria-current', 'page')
})

test('speaks English when asked to', async () => {
  const screen = await renderWithApp(AppTabBar, { locale: 'en' })

  await expect.element(screen.getByRole('link', { name: 'Routes' })).toBeVisible()
})
