import type { Page } from '@playwright/test'

import { expect, fixture, test } from './support'

const thun = {
  id: '8507100',
  name: 'Thun',
  coordinate: { type: 'WGS84', x: 46.754852, y: 7.629607 },
}

async function useRecordedTimetable(page: Page): Promise<void> {
  await page.route('https://transport.opendata.ch/v1/locations?*', (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') ?? ''
    const body = query.startsWith('Thun')
      ? JSON.stringify({ stations: [thun] })
      : fixture('locations.json')
    return route.fulfill({ contentType: 'application/json', body })
  })
  await page.route('https://transport.opendata.ch/v1/connections?*', (route) =>
    route.fulfill({ contentType: 'application/json', body: fixture('connections.json') }),
  )
}

async function chooseStop(page: Page, text: string, stop: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Haltestelle' }).fill(text)
  await page.getByRole('option', { name: stop }).click()
}

test('sets up a first route with the assistant', async ({ page }) => {
  await useRecordedTimetable(page)
  await page.goto('/')

  await page.getByRole('link', { name: 'Route anlegen' }).click()
  await page.getByRole('button', { name: 'Zuhause', exact: true }).click()
  await chooseStop(page, 'Thun', 'Thun')
  await page.getByRole('button', { name: 'Weiter' }).click()

  await page.getByRole('button', { name: 'Arbeit', exact: true }).click()
  await chooseStop(page, 'Zytglogge', 'Bern, Zytglogge')
  await page.getByRole('button', { name: 'Weiter' }).click()

  await page.getByRole('button', { name: /^IC 61/ }).click()
  await expect(page.getByText('Passt zu 2 von 8 Verbindungen.')).toBeVisible()
  await page.getByRole('button', { name: 'Route speichern' }).click()

  const card = page.getByRole('article', { name: 'Zuhause ↔ Arbeit' })
  await expect(card).toBeVisible()
  await expect(card.getByText('Bern, Zytglogge')).toBeVisible()
  await expect(page.getByText('«Zuhause ↔ Arbeit» gespeichert.')).toBeVisible()

  await page.reload()
  await expect(card).toBeVisible()
})
