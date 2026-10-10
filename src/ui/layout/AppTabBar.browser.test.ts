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

test('speaks English, French and Italian when asked to', async () => {
  const english = await renderWithApp(AppTabBar, { locale: 'en' })
  await expect.element(english.getByRole('link', { name: 'Routes' })).toBeVisible()
  await english.unmount()

  const french = await renderWithApp(AppTabBar, { locale: 'fr' })
  await expect.element(french.getByRole('link', { name: 'Trajets' })).toBeVisible()
  await french.unmount()

  const italian = await renderWithApp(AppTabBar, { locale: 'it' })
  await expect.element(italian.getByRole('link', { name: 'Percorsi' })).toBeVisible()
})
