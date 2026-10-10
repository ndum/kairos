import { afterEach, expect, test } from 'vitest'

import { renderWithApp } from '@/test/render'

import SettingsDialog from './SettingsDialog.vue'

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark', 'reduce-motion')
})

test('switches the language right away', async () => {
  const screen = await renderWithApp(SettingsDialog, { props: { open: true } })

  await screen.getByRole('button', { name: /Sprache/ }).click()
  await screen.getByRole('radio', { name: 'English' }).click()

  await expect.element(screen.getByRole('heading', { name: 'Settings' })).toBeVisible()
  expect(localStorage.getItem('kairos:locale')).toBe('en')
})

test('chooses the direction by location once the browser allows it', async () => {
  const screen = await renderWithApp(SettingsDialog, {
    props: { open: true },
    location: { kind: 'found', coordinates: { latitude: 47.56, longitude: 7.6 } },
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

  await screen.getByRole('button', { name: /Sprache/ }).click()
  await screen.getByRole('radio', { name: 'English' }).click()
  await expect.element(screen.getByText(/no access to your location/)).toBeVisible()
})

test('keeps the location on when the position cannot be found yet', async () => {
  const screen = await renderWithApp(SettingsDialog, {
    props: { open: true },
    location: { kind: 'unavailable' },
  })
  const toggle = screen.getByRole('switch', { name: 'Richtung nach Standort' })

  await toggle.click()

  await expect.element(screen.getByText(/Kairos sucht ihn bei jedem Öffnen wieder/)).toBeVisible()
  await expect.element(toggle).toBeChecked()
  expect(localStorage.getItem('kairos:location')).toBe('true')
})

test('shows the weather until the user switches it off', async () => {
  const screen = await renderWithApp(SettingsDialog, { props: { open: true } })
  const toggle = screen.getByRole('switch', { name: 'Wetter' })

  await expect.element(toggle).toBeChecked()
  await toggle.click()

  await expect.element(toggle).not.toBeChecked()
  expect(localStorage.getItem('kairos:weather')).toBe('false')
})

test('reduces motion in the whole app', async () => {
  const screen = await renderWithApp(SettingsDialog, { props: { open: true } })

  await screen.getByRole('switch', { name: 'Bewegung reduzieren' }).click()

  await expect.poll(() => document.documentElement.classList.contains('reduce-motion')).toBe(true)
  expect(localStorage.getItem('kairos:still')).toBe('true')
})

test('switches to the dark appearance', async () => {
  const screen = await renderWithApp(SettingsDialog, { props: { open: true } })

  await screen.getByRole('button', { name: /Erscheinungsbild/ }).click()
  await screen.getByRole('radio', { name: 'Dunkel' }).click()

  await expect.poll(() => document.documentElement.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem('kairos:theme')).toBe('dark')
})
