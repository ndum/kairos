import type { Page } from '@playwright/test'

import { expect, fixture, liestalToMesseplatz, seedRoutes, test } from './support'

const messeplatz = {
  id: '8500899',
  name: 'Basel, Messeplatz',
  coordinate: { type: 'WGS84', x: 47.563454, y: 7.599613 },
}

/** The town hall of Liestal and the stops around it. */
const townHall = { label: 'Rathausstrasse 36 <b>4410 Liestal</b>', lat: 47.48402, lon: 7.7346 }
const stopsNearTownHall = [
  { id: null, name: 'Rathausstrasse 11, 4410 Liestal', coordinate: { x: 47.484763, y: 7.734282 } },
  { id: '8578320', name: 'Liestal, Törli', coordinate: { x: 47.482894, y: 7.735312 } },
  { id: '8500023', name: 'Liestal', coordinate: { x: 47.484461, y: 7.731368 } },
]

async function useRecordedTimetable(page: Page): Promise<void> {
  await page.route('https://transport.opendata.ch/v1/locations?*', (route) => {
    const params = new URL(route.request().url()).searchParams
    const query = params.get('query') ?? ''
    let stations: unknown[] | null = null
    if (params.has('x')) stations = stopsNearTownHall
    else if (params.get('type') === 'poi') stations = []
    else if (query.startsWith('Messe')) stations = [messeplatz]
    const body = stations ? JSON.stringify({ stations }) : fixture('locations.json')
    return route.fulfill({ contentType: 'application/json', body })
  })
  await page.route('https://api3.geo.admin.ch/rest/services/api/SearchServer?*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ results: [{ attrs: townHall }] }),
    }),
  )
  await page.route('https://transport.opendata.ch/v1/connections?*', (route) =>
    route.fulfill({ contentType: 'application/json', body: fixture('connections.json') }),
  )
}

async function chooseStop(page: Page, text: string, stop: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Haltestelle' }).fill(text)
  await page.getByRole('option', { name: stop, exact: true }).click()
}

test('sets up a first route with the assistant', async ({ page }) => {
  await useRecordedTimetable(page)
  await page.goto('/')

  await page.getByRole('link', { name: 'Route anlegen' }).click()
  await page.getByRole('button', { name: 'Zuhause', exact: true }).click()
  await chooseStop(page, 'Liestal', 'Liestal')
  await page.getByRole('button', { name: 'Weiter' }).click()

  await page.getByRole('button', { name: 'Arbeit', exact: true }).click()
  await chooseStop(page, 'Messeplatz', 'Basel, Messeplatz')
  await page.getByRole('button', { name: 'Weiter' }).click()

  await expect(page.getByRole('radio', { name: /Immer die schnellste/ })).toBeChecked()
  await page.getByRole('radio', { name: /S3\s*dann\s*1\b/ }).check()
  await expect(page.getByText('Passt zu 4 von 12 Verbindungen.')).toBeVisible()
  await page.getByRole('button', { name: 'Route speichern' }).click()

  const card = page.getByRole('article', { name: 'Zuhause ↔ Arbeit' })
  await expect(card).toBeVisible()
  await expect(card.getByText('Basel, Messeplatz')).toBeVisible()
  await expect(page.getByText('«Zuhause ↔ Arbeit» gespeichert.')).toBeVisible()

  await page.reload()
  await expect(card).toBeVisible()
})

test('finds the stops near an address', async ({ page }) => {
  await useRecordedTimetable(page)
  await page.goto('/#/routes/new')

  await page.getByRole('button', { name: 'Zuhause', exact: true }).click()
  await page.getByRole('combobox', { name: 'Adresse oder Firma' }).fill('Rathausstrasse 36')
  await page.getByRole('option', { name: 'Rathausstrasse 36, 4410 Liestal' }).click()
  await page.getByRole('radio', { name: /^Liestal\s?250 m/ }).check()

  await expect(page.getByRole('textbox', { name: /Fussweg zur Haltestelle/ })).toHaveValue('5')
  await page.getByRole('button', { name: 'Weiter' }).click()
  await expect(page.getByRole('heading', { name: 'Wohin fährst du?' })).toBeVisible()
})

test('opens the editor of a route right after the one for a new route', async ({ page }) => {
  await seedRoutes(page, [liestalToMesseplatz])
  await page.goto('/#/routes/new')
  await expect(page.getByRole('heading', { name: 'Neue Route' })).toBeVisible()

  await page.goto(`/#/routes/${liestalToMesseplatz.id}`)

  await expect(page.getByRole('heading', { name: 'Route bearbeiten' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Start' })).toBeVisible()
})
