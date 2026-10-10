import { expect, fixture, liestalToMesseplatz, seedRoutes, test, weatherFixture } from './support'

test.beforeEach(async ({ page }) => {
  // The recorded connections run on Monday, 19 October 2026, from 07:00.
  await page.clock.install({ time: new Date('2026-10-19T06:44:30+02:00') })
  await page.route('https://transport.opendata.ch/v1/connections?*', (route) => {
    const from = new URL(route.request().url()).searchParams.get('from')
    const body = from === '8500023' ? fixture('connections.json') : '{"connections":[]}'
    return route.fulfill({ contentType: 'application/json', body })
  })
  await seedRoutes(page, [liestalToMesseplatz])
})

test('counts down to leaving for the next train', async ({ page }) => {
  const hero = page.getByRole('region', { name: /Zuhause nach Arbeit/ })

  // The IR 37 leaves Liestal at 07:05: 8 minutes on foot and 3 minutes of buffer before.
  await expect(hero).toContainText(/Losgehen in\s*9\s*Min\./)
  await expect(hero).toContainText('Genug Zeit')
  await expect(hero).toContainText('Gleis 4')
  await expect(page.getByRole('region', { name: 'Deine Verbindung' })).toContainText(
    'Richtung Basel SBB',
  )

  await page.clock.fastForward('05:00')

  await expect(hero).toContainText(/Losgehen in\s*4\s*Min\./)
  await expect(hero).toContainText('Bald los')

  // Without the buffer, the IR 37 is still in reach. The S3 at 07:10 becomes the main trip.
  await page.clock.fastForward('06:00')

  await expect(hero).toContainText(/Losgehen in\s*3\s*Min\./)
  await expect(hero).toContainText('Ohne Puffer noch erreichbar: Abfahrt 07:05')
})

test('shows the weather when leaving and warns about rain on the walk', async ({ page }) => {
  // Quarter hours from 06:45 in Swiss time: cloudy, then rain from 07:00.
  const forecast = weatherFixture([
    [1792385100, 7.2, 0, 3],
    [1792386000, 7.4, 0.6, 61],
    [1792386900, 7.5, 0.2, 61],
  ])
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ contentType: 'application/json', body: forecast }),
  )
  await page.reload()

  const hero = page.getByRole('region', { name: /Zuhause nach Arbeit/ })
  await expect(
    hero.getByRole('img', { name: 'Wetter beim Losgehen: bewölkt, 7 Grad' }),
  ).toBeVisible()
  await expect(hero).toContainText('Gegen 07:00 regnet es auf dem Fussweg zur Haltestelle.')
  await expect(page.getByText('Wetter: Open-Meteo.com')).toBeVisible()
})

test.describe('at work in the morning', () => {
  test.use({ geolocation: { latitude: 47.5635, longitude: 7.5998 }, permissions: ['geolocation'] })

  test('starts with the way home once the location may choose the direction', async ({ page }) => {
    await expect(page.getByRole('region', { name: /Zuhause nach Arbeit Losgehen/ })).toBeVisible()

    await page.getByRole('button', { name: 'Einstellungen' }).click()
    const location = page.getByRole('switch', { name: 'Richtung nach Standort' })
    await location.click()
    await expect(location).toBeChecked()
    await page.getByRole('button', { name: 'Schliessen' }).click()

    const hero = page.getByRole('region', { name: /Arbeit nach Zuhause Losgehen/ })
    await expect(hero).toContainText('Keine Verbindung in den nächsten Stunden.')
    await expect(page.getByRole('main').getByText('Richtung nach Standort')).toBeVisible()
  })
})

test('shows the other direction and switches to it', async ({ page }) => {
  const back = page.getByRole('region', { name: /Arbeit nach Zuhause/ })
  await expect(back).toContainText('Keine Verbindung in den nächsten Stunden.')

  await back.getByRole('button', { name: 'Richtung wechseln' }).click()

  await expect(page.getByRole('region', { name: /Arbeit nach Zuhause/ })).toContainText(
    'Keine Verbindung in den nächsten Stunden.',
  )
  await expect(page.getByRole('region', { name: /Zuhause nach Arbeit/ })).toContainText(
    'Nächste: losgehen',
  )
})
