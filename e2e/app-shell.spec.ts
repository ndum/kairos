import { expect, test } from '@playwright/test'

test('loads the app shell', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Kairos')
  await expect(page.getByRole('heading', { name: 'Kairos' })).toBeVisible()
})
