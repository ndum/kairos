import type { Page } from '@playwright/test'

import { expect, seedRoutes, test, liestalToMesseplatz } from './support'

/** Shares the stored routes and returns the link, then empties the device like a new one. */
async function shareFromFirstDevice(page: Page): Promise<string> {
  await seedRoutes(page, [liestalToMesseplatz])
  await page.getByRole('link', { name: 'Routen' }).first().click()

  await page.getByRole('button', { name: 'Teilen' }).click()
  const field = page.getByRole('dialog').getByRole('textbox', { name: 'Link' })
  await expect(field).toHaveValue(/#\/import\?r=[\w-]+$/)
  await expect(page.getByRole('img', { name: /QR-Code/ })).toBeVisible()
  const link = await field.inputValue()

  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.goto('about:blank')
  return link
}

test('passes routes to another device by opening the link', async ({ page }) => {
  const link = await shareFromFirstDevice(page)

  await page.goto(link)
  await expect(page.getByRole('heading', { name: 'Routen übernehmen' })).toBeVisible()
  await expect(page.getByText('Neu')).toBeVisible()
  await page.getByRole('button', { name: 'Route übernehmen' }).click()

  await expect(page.getByRole('article', { name: 'Zuhause ↔ Arbeit' })).toBeVisible()
  const routes = await page.evaluate(() => localStorage.getItem('kairos:routes') ?? '')
  expect(routes).toContain('Basel, Messeplatz')
  expect(routes).not.toContain('47.4861')
})

test('passes routes to the installed app by pasting the link', async ({ page }) => {
  const link = await shareFromFirstDevice(page)

  await page.goto('/')
  await page.getByRole('button', { name: 'Per Link übernehmen' }).click()
  await page.getByRole('dialog').getByRole('textbox', { name: 'Link' }).fill(link)
  await page.getByRole('button', { name: 'Weiter' }).click()
  await page.getByRole('button', { name: 'Route übernehmen' }).click()

  await expect(page.getByRole('article', { name: 'Zuhause ↔ Arbeit' })).toBeVisible()
})
