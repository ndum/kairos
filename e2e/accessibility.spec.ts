import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

import { expect, fixture, seedRoutes, test, liestalToMesseplatz } from './support'

/** Checks the page against WCAG 2.2 level AA and lists each violation with its elements. */
async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return results.violations.map(
    ({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
  )
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T06:44:30+02:00') })
  await page.route('https://transport.opendata.ch/v1/connections?*', (route) => {
    const from = new URL(route.request().url()).searchParams.get('from')
    const body = from === '8500023' ? fixture('connections.json') : '{"connections":[]}'
    return route.fulfill({ contentType: 'application/json', body })
  })
})

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`in the ${colorScheme} appearance`, () => {
    test.use({ colorScheme })

    test('the empty start is accessible', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'Noch keine Route' })).toBeVisible()

      expect(await violations(page)).toEqual([])
    })

    test('the board is accessible', async ({ page }) => {
      await seedRoutes(page, [liestalToMesseplatz])
      await expect(page.getByRole('region', { name: 'Deine Verbindung' })).toBeVisible()

      expect(await violations(page)).toEqual([])
    })

    test('planning and its details are accessible', async ({ page }) => {
      await seedRoutes(page, [liestalToMesseplatz])
      await page.getByRole('link', { name: 'Planen' }).click()
      await expect(page.getByRole('heading', { name: 'Verbindungen' })).toBeVisible()
      expect(await violations(page)).toEqual([])

      await page.getByRole('button', { name: 'Details' }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(await violations(page)).toEqual([])
    })

    test('the routes, the editor and the dialogs are accessible', async ({ page }) => {
      await seedRoutes(page, [liestalToMesseplatz])
      await page.getByRole('link', { name: 'Routen' }).click()
      await expect(page.getByRole('article', { name: 'Zuhause ↔ Arbeit' })).toBeVisible()
      expect(await violations(page)).toEqual([])

      await page.getByRole('button', { name: 'Teilen' }).click()
      await expect(page.getByRole('img', { name: /QR-Code/ })).toBeVisible()
      expect(await violations(page)).toEqual([])
      await page.getByRole('button', { name: 'Schliessen' }).click()

      await page.getByRole('button', { name: 'Einstellungen' }).click()
      await expect(page.getByRole('dialog', { name: 'Einstellungen' })).toBeVisible()
      expect(await violations(page)).toEqual([])
      await page.getByRole('button', { name: 'Schliessen' }).click()

      await page.getByRole('link', { name: '«Zuhause ↔ Arbeit» bearbeiten' }).click()
      await expect(page.getByRole('heading', { name: 'Route bearbeiten' })).toBeVisible()
      expect(await violations(page)).toEqual([])
    })
  })
}
