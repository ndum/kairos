import { expect, test } from './support'

test('opens on the leave-in view with an invitation to add a route', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Kairos')
  await expect(page.getByRole('heading', { name: 'Noch keine Route' })).toBeVisible()
})

test('navigates between the three areas', async ({ page }) => {
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' })

  await navigation.getByRole('link', { name: 'Planen' }).click()
  await expect(page.getByRole('heading', { name: 'Zuerst eine Route anlegen' })).toBeVisible()

  await navigation.getByRole('link', { name: 'Routen' }).click()
  await expect(page).toHaveURL(/#\/routes$/)
  await expect(page.getByRole('heading', { name: 'Hier entstehen deine Routen' })).toBeVisible()
})

test.describe('in English', () => {
  test.use({ locale: 'en-GB' })

  test('follows the language of the device', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'No route yet' })).toBeVisible()
  })
})

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('animates the scene', async ({ page }) => {
    await page.goto('/')

    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0)
  })
})

test.describe('with reduced motion', () => {
  test('keeps the scene still', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Noch keine Route' })).toBeVisible()

    const running = await page.evaluate(
      () =>
        document.getAnimations().filter((animation) => animation.playState === 'running').length,
    )
    expect(running).toBe(0)
  })
})

test.describe('at night', () => {
  test.use({ colorScheme: 'dark' })

  test('follows the dark appearance of the device', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
