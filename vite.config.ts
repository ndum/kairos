import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// KAIROS_BASE is set by the deployment workflows: /kairos/ for GitHub Pages and a
// sub-path per pull request for previews. Local builds are served from the root.
export default defineConfig(({ mode }) => ({
  base: process.env.KAIROS_BASE ?? '/',
  plugins: [vue(), tailwindcss(), mode === 'lan' && basicSsl()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    manifest: true,
  },
}))
