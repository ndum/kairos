import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.ts'

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      coverage: {
        provider: 'v8',
        include: ['src/domain/**', 'src/application/**', 'src/infrastructure/**'],
        exclude: ['**/*.test.ts'],
        thresholds: {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/**/*.test.ts'],
            exclude: ['src/**/*.browser.test.ts'],
          },
        },
        {
          extends: true,
          // Pre-bundling these up front avoids a reload during the first browser run.
          optimizeDeps: {
            include: ['vue', 'vitest-browser-vue'],
          },
          test: {
            name: 'browser',
            include: ['src/**/*.browser.test.ts'],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }, { browser: 'webkit' }],
            },
          },
        },
      ],
    },
  }),
)
