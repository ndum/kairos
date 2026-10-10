import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import VueI18n from '@intlify/unplugin-vue-i18n/vite'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { contentSecurityPolicy } from './scripts/vite-plugin-csp.ts'

// The app is served from the root of its own domain. Only the previews of pull requests
// set KAIROS_BASE to their sub-path.
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

export default defineConfig(({ mode }) => ({
  base: process.env.KAIROS_BASE ?? '/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    vue(),
    tailwindcss(),
    // Precompiles the messages, so the app ships the smaller runtime-only build of vue-i18n.
    VueI18n({
      include: fileURLToPath(new URL('./src/ui/i18n/locales/**', import.meta.url)),
      fullInstall: false,
    }),
    Icons({ compiler: 'vue3' }),
    VitePWA({
      // The app asks before it reloads with a new version, see use-app-update.ts.
      registerType: 'prompt',
      injectRegister: false,
      pwaAssets: { config: true, overrideManifestIcons: true, injectThemeColor: false },
      manifest: {
        id: '.',
        name: 'Kairos',
        short_name: 'Kairos',
        description: 'Wann du losmusst, auf die Minute.',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#5d6cd0',
        background_color: '#5d6cd0',
        categories: ['travel', 'navigation'],
      },
      workbox: {
        // The plugin adds the manifest itself. Listing it twice would stop the whole precache.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,txt}'],
        // German, English, French and Italian only need the Latin subsets of the font.
        globIgnores: ['**/*-cyrillic*', '**/*-vietnamese*'],
        navigateFallback: 'index.html',
        // Pull request previews live below the production app and bring their own worker.
        navigateFallbackDenylist: [/\/pr-preview\//],
        cleanupOutdatedCaches: true,
      },
    }),
    contentSecurityPolicy([
      'https://transport.opendata.ch',
      'https://api3.geo.admin.ch',
      'https://api.open-meteo.com',
    ]),
    mode === 'lan' && basicSsl(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Test reports land next to the sources and must not reload the running app.
    watch: { ignored: ['**/coverage/**', '**/playwright-report/**', '**/test-results/**'] },
  },
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        // Libraries change less often than the app, so their own chunk stays cached across
        // releases. Only code needed at the start is grouped: libraries such as the QR code
        // generator and the app's own lazy parts stay apart, and the start needs no tiny
        // chunks of code shared with them.
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /\/node_modules\/|plugin-vue:export-helper/,
              tags: ['$initial'],
            },
            { name: 'app', test: /\/src\//, tags: ['$initial'] },
          ],
        },
      },
    },
  },
}))
