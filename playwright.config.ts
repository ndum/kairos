import { defineConfig, devices } from '@playwright/test'

const port = 4173
const isCI = Boolean(process.env.CI)

// CI builds the app in an earlier step; locally the web server builds it first.
const serve = `npm run preview -- --port ${port} --strictPort`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 17'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: isCI ? serve : `npm run build && ${serve}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
