import { readFileSync } from 'node:fs'

import { type Page, test as base, expect as expectBase } from '@playwright/test'

export { expect } from '@playwright/test'

/**
 * Requests to the Transport API, the address search and the weather service get an empty
 * answer unless a test answers them itself, so no test depends on the real services. Handlers
 * registered later take precedence.
 */
export const test = base.extend<{ quietServices: undefined; policyGuard: undefined }>({
  quietServices: [
    async ({ page }, use) => {
      await page.route('https://transport.opendata.ch/**', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: '{"connections":[],"stations":[]}',
        }),
      )
      await page.route('https://api3.geo.admin.ch/**', (route) =>
        route.fulfill({ contentType: 'application/json', body: '{"results":[]}' }),
      )
      await page.route('https://api.open-meteo.com/**', (route) =>
        route.fulfill({ contentType: 'application/json', body: weatherFixture([]) }),
      )
      await use(undefined)
    },
    { auto: true },
  ],
  /** Fails a test whenever the Content Security Policy blocks something on the page. */
  policyGuard: [
    async ({ page }, use) => {
      const violations: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
          violations.push(message.text())
        }
      })
      await use(undefined)
      expectBase(violations).toEqual([])
    },
    { auto: true },
  ],
})

/** A forecast of Open-Meteo in quarter hours, given as [unix seconds, °C, mm, weather code]. */
export const weatherFixture = (steps: readonly (readonly [number, number, number, number])[]) =>
  JSON.stringify({
    minutely_15: {
      time: steps.map(([time]) => time),
      temperature_2m: steps.map(([, temperature]) => temperature),
      precipitation: steps.map(([, , precipitation]) => precipitation),
      weather_code: steps.map(([, , , code]) => code),
      is_day: steps.map(() => 1),
    },
  })

/** A recorded response of the Transport API, so the tests neither depend on nor load it. */
export const fixture = (name: string): string =>
  readFileSync(
    new URL(`../src/infrastructure/transport-opendata/fixtures/${name}`, import.meta.url),
    'utf8',
  )

const minute = 60_000

/** Liestal to Basel, Messeplatz: the connections in the fixture run between these stops. */
export const liestalToMesseplatz = {
  id: 'k3x9p2m7q4tz',
  name: 'Zuhause ↔ Arbeit',
  places: [
    {
      name: 'Zuhause',
      stop: {
        id: '8500023',
        name: 'Liestal',
        coordinates: { latitude: 47.48446, longitude: 7.73137 },
      },
      walk: 8 * minute,
      coordinates: { latitude: 47.4861, longitude: 7.7302 },
    },
    {
      name: 'Arbeit',
      stop: {
        id: '8500899',
        name: 'Basel, Messeplatz',
        coordinates: { latitude: 47.56345, longitude: 7.59961 },
      },
      walk: 5 * minute,
    },
  ],
  buffer: 3 * minute,
  preferredLines: [],
}

/** Stores routes like the app does and reloads, so the app starts with them. */
export async function seedRoutes(page: Page, routes: unknown[]): Promise<void> {
  await page.goto('/')
  await page.evaluate(
    (stored) => {
      localStorage.setItem('kairos:routes', stored)
    },
    JSON.stringify({ version: 2, routes }),
  )
  await page.reload()
}
