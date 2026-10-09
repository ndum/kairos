import { readFileSync } from 'node:fs'

import { type Page, test as base } from '@playwright/test'

export { expect } from '@playwright/test'

/**
 * Requests to the Transport API get an empty answer unless a test answers them itself, so no
 * test depends on the real timetable. Handlers registered later take precedence.
 */
export const test = base.extend<{ quietTimetable: undefined }>({
  quietTimetable: [
    async ({ page }, use) => {
      await page.route('https://transport.opendata.ch/**', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: '{"connections":[],"stations":[]}',
        }),
      )
      await use(undefined)
    },
    { auto: true },
  ],
})

/** A recorded response of the Transport API, so the tests neither depend on nor load it. */
export const fixture = (name: string): string =>
  readFileSync(
    new URL(`../src/infrastructure/transport-opendata/fixtures/${name}`, import.meta.url),
    'utf8',
  )

const minute = 60_000

/** Thun to Bern, Zytglogge: the connections in the fixture run between these stops. */
export const thunToZytglogge = {
  id: 'k3x9p2m7q4tz',
  name: 'Zuhause ↔ Arbeit',
  places: [
    {
      name: 'Zuhause',
      stop: {
        id: '8507100',
        name: 'Thun',
        coordinates: { latitude: 46.75485, longitude: 7.6296 },
      },
      walk: 8 * minute,
      reserve: 3 * minute,
      coordinates: { latitude: 46.7561, longitude: 7.6281 },
    },
    {
      name: 'Arbeit',
      stop: {
        id: '8507110',
        name: 'Bern, Zytglogge',
        coordinates: { latitude: 46.94784, longitude: 7.4475 },
      },
      walk: 5 * minute,
      reserve: 3 * minute,
    },
  ],
  preferredLines: [{ name: 'IC 61', mode: 'train' }],
}

/** Stores routes like the app does and reloads, so the app starts with them. */
export async function seedRoutes(page: Page, routes: unknown[]): Promise<void> {
  await page.goto('/')
  await page.evaluate(
    (stored) => {
      localStorage.setItem('kairos:routes', stored)
    },
    JSON.stringify({ version: 1, routes }),
  )
  await page.reload()
}
