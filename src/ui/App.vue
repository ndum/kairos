<script setup lang="ts">
import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import ToastHost from './components/ToastHost.vue'
import { useAppearance } from './composables/use-appearance'
import AppTabBar from './layout/AppTabBar.vue'
import AppTopBar from './layout/AppTopBar.vue'
import AppScene from './scene/AppScene.vue'
import { useSceneStore } from './stores/scene'

const { t, locale } = useI18n()
const { still } = useAppearance()
const scene = useSceneStore()

// Screen readers and hyphenation follow the language of the page.
watchEffect(() => {
  document.documentElement.lang = locale.value
})
</script>

<template>
  <AppScene
    :still
    :urgency="scene.urgency"
    :station-name="scene.stationName"
    :departure-at="scene.departureAt"
  />

  <div class="shell relative z-10 mx-auto flex min-h-dvh max-w-[3840px] flex-col">
    <AppTopBar />
    <main class="flex-1">
      <RouterView />
    </main>
    <p class="credit">{{ t('credit') }}</p>
  </div>

  <ToastHost />
  <AppTabBar />
</template>

<style scoped>
.shell {
  gap: clamp(0.875rem, 1.3vw, 2rem);
  padding-inline: clamp(1rem, 2.4vw, 5rem);
  padding-top: max(0.875rem, env(safe-area-inset-top, 0px));
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 7rem);
}

.credit {
  align-self: flex-start;
  border-radius: 1rem;
  padding: 0.5rem 0.875rem;
  background: linear-gradient(165deg, var(--color-glass), var(--color-glass-deep));
  box-shadow: inset 0 0 0 1px var(--color-edge-faint);
  color: var(--color-ink-muted);
  font-size: 0.78rem;
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

@media (min-width: 900px) {
  .shell {
    padding-bottom: 28vh;
  }

  .credit {
    position: fixed;
    right: clamp(1rem, 2.4vw, 5rem);
    bottom: 0.625rem;
    padding: 0;
    background: none;
    box-shadow: none;
    color: rgb(255 255 255 / 0.8);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
