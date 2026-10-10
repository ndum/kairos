import { expect, fixture, seedRoutes, test, thunToZytglogge } from './support'

test.use({ serviceWorkers: 'allow' })

test('starts without a connection and counts down with the last known data', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Playwright controls service workers in Chromium only')

  await page.clock.install({ time: new Date('2026-10-12T06:44:30+02:00') })
  await page.route('https://transport.opendata.ch/v1/connections?*', (route) => {
    const from = new URL(route.request().url()).searchParams.get('from')
    const body = from === '8507100' ? fixture('connections.json') : '{"connections":[]}'
    return route.fulfill({ contentType: 'application/json', body })
  })
  await seedRoutes(page, [thunToZytglogge])
  const hero = page.getByRole('region', { name: /Zuhause nach Arbeit/ })
  await expect(hero).toContainText(/Losgehen in\s*8\s*Min\./)

  // Once the service worker controls the page, it has stored the app.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true)

  await page.unrouteAll()
  await context.setOffline(true)
  await page.reload()

  await expect(hero).toContainText(/Losgehen in\s*8\s*Min\./)
  await expect(page.getByRole('status').filter({ hasText: /^Offline$/ })).toBeAttached()
})
