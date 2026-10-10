import { fileURLToPath, URL } from 'node:url'

import VueI18n from '@intlify/unplugin-vue-i18n/vite'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

// KAIROS_BASE is set by the deployment workflows: /kairos/ for GitHub Pages and a
// sub-path per pull request for previews. Local builds are served from the root.
export default defineConfig(({ mode }) => ({
  base: process.env.KAIROS_BASE ?? '/',
  plugins: [
    vue(),
    tailwindcss(),
    // Precompiles the messages, so the app ships the smaller runtime-only build of vue-i18n.
    VueI18n({
      include: fileURLToPath(new URL('./src/ui/i18n/locales/**', import.meta.url)),
      fullInstall: false,
    }),
    Icons({ compiler: 'vue3' }),
    mode === 'lan' && basicSsl(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        // Libraries change less often than the app, so their own chunk stays cached across
        // releases. Only those needed at the start go there, the QR code generator stays apart.
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /\/node_modules\/|plugin-vue:export-helper/,
              tags: ['$initial'],
            },
          ],
        },
      },
    },
  },
}))
