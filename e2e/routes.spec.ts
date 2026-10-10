import type { Page } from '@playwright/test'

import { expect, fixture, test } from './support'

const messeplatz = {
  id: '8500899',
  name: 'Basel, Messeplatz',
  coordinate: { type: 'WGS84', x: 47.563454, y: 7.599613 },
}

async function useRecordedTimetable(page: Page): Promise<void> {
  await page.route('https://transport.opendata.ch/v1/locations?*', (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') ?? ''
    const body = query.startsWith('Messe')
      ? JSON.stringify({ stations: [messeplatz] })
      : fixture('locations.json')
    return route.fulfill({ contentType: 'application/json', body })
  })
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

  await page.getByRole('button', { name: /^S3 in / }).click()
  await page.getByRole('button', { name: /^1 in / }).click()
  await expect(page.getByText('Passt zu 4 von 12 Verbindungen.')).toBeVisible()
  await page.getByRole('button', { name: 'Route speichern' }).click()

  const card = page.getByRole('article', { name: 'Zuhause ↔ Arbeit' })
  await expect(card).toBeVisible()
  await expect(card.getByText('Basel, Messeplatz')).toBeVisible()
  await expect(page.getByText('«Zuhause ↔ Arbeit» gespeichert.')).toBeVisible()

  await page.reload()
  await expect(card).toBeVisible()
})
