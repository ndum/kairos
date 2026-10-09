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

test('chooses the direction by location once the browser allows it', async () => {
  const screen = await renderWithApp(SettingsDialog, {
    props: { open: true },
    location: { kind: 'found', coordinates: { latitude: 46.8, longitude: 7.5 } },
  })
  const toggle = screen.getByRole('switch', { name: 'Richtung nach Standort' })

  await toggle.click()

  await expect.element(toggle).toBeChecked()
  expect(localStorage.getItem('kairos:location')).toBe('true')
})

test('explains when the browser refuses the location', async () => {
  const screen = await renderWithApp(SettingsDialog, {
    props: { open: true },
    location: { kind: 'denied' },
  })
  const toggle = screen.getByRole('switch', { name: 'Richtung nach Standort' })

  await toggle.click()

  await expect.element(screen.getByText(/keinen Zugriff auf den Standort/)).toBeVisible()
  await expect.element(toggle).not.toBeChecked()
  expect(localStorage.getItem('kairos:location')).toBe('false')
})

test('switches to the dark appearance', async () => {
  const screen = await renderWithApp(SettingsDialog, { props: { open: true } })

  await screen.getByText('Dunkel').click()

  await expect.poll(() => document.documentElement.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem('kairos:theme')).toBe('dark')
})
