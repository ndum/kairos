import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Icons for the Home Screen and the manifest, generated from the favicon at build time.
// Icons that platforms crop or place on a tile get the dark background of the brand mark.
const tile = { background: '#14163a' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: tile },
    apple: { ...minimal2023Preset.apple, resizeOptions: tile },
  },
  images: ['public/favicon.svg'],
})
