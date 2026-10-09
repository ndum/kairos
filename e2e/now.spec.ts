import { expect, fixture, seedRoutes, test, thunToZytglogge } from './support'

test.beforeEach(async ({ page }) => {
  // The recorded connections run on Monday, 12 October 2026, from 07:00.
  await page.clock.install({ time: new Date('2026-10-12T06:44:30+02:00') })
  await page.route('https://transport.opendata.ch/v1/connections?*', (route) => {
    const from = new URL(route.request().url()).searchParams.get('from')
    const body = from === '8507100' ? fixture('connections.json') : '{"connections":[]}'
    return route.fulfill({ contentType: 'application/json', body })
  })
  await seedRoutes(page, [thunToZytglogge])
})

test('counts down to leaving for the next train', async ({ page }) => {
  const hero = page.getByRole('region', { name: /Zuhause nach Arbeit/ })

  // The IC 61 leaves Thun at 07:04: 8 minutes on foot and 3 minutes of reserve before.
  await expect(hero).toContainText(/Losgehen in\s*8\s*Min\./)
  await expect(hero).toContainText('Genug Zeit')
  await expect(hero).toContainText('Gleis 3')
  await expect(page.getByRole('region', { name: 'Deine Verbindung' })).toContainText(
    'Richtung Basel SBB',
  )
  // With bus 19 instead of the walk at the end, the same train arrives eleven minutes earlier.
  await expect(hero).toContainText(/Schneller mit\s*IC 61\s*19/)

  await page.clock.fastForward('05:00')

  await expect(hero).toContainText(/Losgehen in\s*3\s*Min\./)
  await expect(hero).toContainText('Bald los')
})

test.describe('at work in the morning', () => {
  test.use({ geolocation: { latitude: 46.9481, longitude: 7.4469 }, permissions: ['geolocation'] })

  test('starts with the way home once the location may choose the direction', async ({ page }) => {
    await expect(page.getByRole('region', { name: /Zuhause nach Arbeit Losgehen/ })).toBeVisible()

    await page.getByRole('button', { name: 'Einstellungen' }).click()
    // The switch only turns on once the browser has given the position.
    const location = page.getByRole('switch', { name: 'Richtung nach Standort' })
    await location.click()
    await expect(location).toBeChecked()
    await page.getByRole('button', { name: 'Schliessen' }).click()

    await expect(page.getByRole('region', { name: /Arbeit nach Zuhause Losgehen/ })).toContainText(
      'Keine Verbindung in den nächsten Stunden.',
    )
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
    'Losgehen in',
  )
})
