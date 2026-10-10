import { defineConfig } from '@playwright/test'

import base from './playwright.config.ts'

// Captures the screenshots of the README from the production build. Run with
// `npm run docs:screenshots` after changes to the interface.
export default defineConfig({
  ...base,
  testDir: './scripts/screenshots',
  testMatch: '*.capture.ts',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  projects: [{ name: 'screenshots' }],
})
