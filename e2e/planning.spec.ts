import { expect, fixture, seedRoutes, test, thunToZytglogge } from './support'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-12T06:29:30+02:00') })
  await page.route('https://transport.opendata.ch/v1/connections?*', (route) => {
    const from = new URL(route.request().url()).searchParams.get('from')
    const body = from === '8507100' ? fixture('connections.json') : '{"connections":[]}'
    return route.fulfill({ contentType: 'application/json', body })
  })
  await seedRoutes(page, [thunToZytglogge])
})

test('plans a trip by its arrival and counts down to it once pinned', async ({ page }) => {
  await page.getByRole('link', { name: 'Planen' }).click()
  await page.getByText('Ankunft bis').click()
  await page.getByLabel('Uhrzeit').fill('07:50')

  // The IC 61 at 07:04 arrives at 07:47, five minutes on foot included.
  const trip = page.getByRole('article', { name: 'Losgehen um 06:53 mit IC 61', exact: true })
  await expect(trip).toContainText('Empfohlen')
  await trip.getByRole('button', { name: 'Merken' }).click()
  await expect(trip).toContainText('Gemerkt')

  await page.getByRole('link', { name: 'Jetzt' }).click()
  const pinned = page.getByRole('region', { name: 'Gemerkte Fahrt' })
  await expect(pinned).toContainText(/Losgehen in\s*23\s*Min\./)
  await expect(pinned).toContainText('IC 61')
})
