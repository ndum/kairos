import { afterEach, expect, test } from 'vitest'

import { renderWithApp } from '@/test/render'

import SettingsDialog from './SettingsDialog.vue'

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

test('switches the language right away', async () => {
  const screen = await renderWithApp(SettingsDialog, { props: { open: true } })

  await screen.getByText('English').click()

  await expect.element(screen.getByRole('heading', { name: 'Settings' })).toBeVisible()
  expect(localStorage.getItem('kairos:locale')).toBe('en')
})

test('switches to the dark appearance', async () => {
  const screen = await renderWithApp(SettingsDialog, { props: { open: true } })

  await screen.getByText('Dunkel').click()

  await expect.poll(() => document.documentElement.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem('kairos:theme')).toBe('dark')
})
