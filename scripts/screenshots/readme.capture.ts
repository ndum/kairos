import { type Browser, test } from '@playwright/test'

import { fixture, liestalToMesseplatz } from '../../e2e/support'

interface Shot {
  readonly name: string
  readonly path: string
  readonly phone: boolean
  readonly colorScheme: 'light' | 'dark'
}

const route = liestalToMesseplatz

const SHOTS: readonly Shot[] = [
  { name: 'now-phone-light', path: '/', phone: true, colorScheme: 'light' },
  { name: 'now-phone-dark', path: '/', phone: true, colorScheme: 'dark' },
  { name: 'now-desktop-light', path: '/', phone: false, colorScheme: 'light' },
  { name: 'plan-desktop-dark', path: '/#/plan', phone: false, colorScheme: 'dark' },
]

/** A fresh device with the recorded connections, a fixed clock and a still landscape. */
async function device(browser: Browser, shot: Shot) {
  const context = await browser.newContext({
    viewport: shot.phone ? { width: 390, height: 844 } : { width: 1600, height: 900 },
    deviceScaleFactor: 2,
    isMobile: shot.phone,
    hasTouch: shot.phone,
    colorScheme: shot.colorScheme,
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  })
  const page = await context.newPage()
  await page.clock.install({ time: new Date('2026-10-19T06:46:30+02:00') })
  await page.route('https://transport.opendata.ch/v1/connections?*', (route) => {
    const from = new URL(route.request().url()).searchParams.get('from')
    const body = from === '8500023' ? fixture('connections.json') : '{"connections":[]}'
    return route.fulfill({ contentType: 'application/json', body })
  })
  await page.goto('/')
  await page.evaluate(
    (routes) => {
      localStorage.setItem('kairos:routes', routes)
    },
    JSON.stringify({ version: 1, routes: [route] }),
  )
  return { context, page }
}

for (const shot of SHOTS) {
  test(shot.name, async ({ browser }) => {
    const { context, page } = await device(browser, shot)
    await page.goto(shot.path)
    await page.reload()
    await page.getByRole('heading', { level: 1 }).waitFor({ state: 'attached' })
    // Waits for the fonts and the data before the picture is taken.
    await page.evaluate(() => document.fonts.ready)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `docs/screenshots/${shot.name}.jpg`, type: 'jpeg', quality: 85 })
    await context.close()
  })
}
