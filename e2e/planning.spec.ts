import { expect, fixture, seedRoutes, test, liestalToMesseplatz } from './support'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T06:29:30+02:00') })
  await page.route('https://transport.opendata.ch/v1/connections?*', (route) => {
    const from = new URL(route.request().url()).searchParams.get('from')
    const body = from === '8500023' ? fixture('connections.json') : '{"connections":[]}'
    return route.fulfill({ contentType: 'application/json', body })
  })
  await seedRoutes(page, [liestalToMesseplatz])
})

test('plans a trip by its arrival and counts down to it once pinned', async ({ page }) => {
  await page.getByRole('link', { name: 'Planen' }).click()
  await page.getByText('Ankunft bis').click()
  await page.getByLabel('Uhrzeit').fill('07:50')

  // The last trip in time is recommended: the S3 at 07:10 and tram 1 arrive at 07:44, five
  // minutes on foot included.
  const trip = page.getByRole('article', { name: 'Losgehen um 06:59 mit S3, 1', exact: true })
  await expect(trip).toContainText('Empfohlen')
  await trip.getByRole('button', { name: 'Merken' }).click()
  await expect(trip).toContainText('Gemerkt')

  await page.getByRole('link', { name: 'Jetzt' }).click()
  const pinned = page.getByRole('region', { name: 'Gemerkte Fahrt' })
  await expect(pinned).toContainText(/Losgehen in\s*29\s*Min\./)
  await expect(pinned).toContainText('S3')
})
