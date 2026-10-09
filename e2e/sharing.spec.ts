import { type Page, expect, test } from '@playwright/test'

const minute = 60_000

const stored = JSON.stringify({
  version: 1,
  routes: [
    {
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
          stop: { id: '8507110', name: 'Bern, Zytglogge' },
          walk: 5 * minute,
          reserve: 3 * minute,
        },
      ],
      preferredLines: [{ name: 'IC 61', mode: 'train' }],
    },
  ],
})

/** Shares the stored routes and returns the link, then empties the device like a new one. */
async function shareFromFirstDevice(page: Page): Promise<string> {
  await page.goto('/')
  await page.evaluate((routes) => {
    localStorage.setItem('kairos:routes', routes)
  }, stored)
  await page.goto('/#/routes')
  await page.reload()

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
  expect(routes).toContain('Bern, Zytglogge')
  expect(routes).not.toContain('46.7561')
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
