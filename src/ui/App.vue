<script setup lang="ts">
import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import ToastHost from './components/ToastHost.vue'
import { useAppUpdate } from './composables/use-app-update'
import { useAppearance } from './composables/use-appearance'
import { focusMainHeading, usePageNavigation } from './composables/use-page-navigation'
import { useWeatherPreference } from './composables/use-weather-preference'
import AppTabBar from './layout/AppTabBar.vue'
import AppTopBar from './layout/AppTopBar.vue'
import AppScene from './scene/AppScene.vue'
import { useSceneStore } from './stores/scene'

const { t, locale } = useI18n()
const { still } = useAppearance()
const scene = useSceneStore()
// The weather has a source of its own, which is credited while it is shown.
const showWeather = useWeatherPreference()
useAppUpdate()
usePageNavigation()

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

  <div class="shell relative z-10 mx-auto flex min-h-dvh w-full max-w-[80rem] flex-col">
    <button type="button" class="skip-link glass" @click="focusMainHeading">
      {{ t('app.skip') }}
    </button>
    <AppTopBar />
    <main class="flex-1">
      <!-- A new path gets a new view, so the editor never keeps the form of another route. -->
      <RouterView v-slot="{ Component, route }">
        <component :is="Component" :key="route.path" />
      </RouterView>
    </main>
    <p class="credit">{{ showWeather ? t('creditWithWeather') : t('credit') }}</p>
  </div>

  <ToastHost />
  <AppTabBar />
</template>

<style scoped>
.shell {
  gap: 0.875rem;
  padding-inline: 1rem;
  padding-top: max(0.5rem, env(safe-area-inset-top, 0px));
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6rem);
}

/* Hidden until a keyboard user reaches it as the first stop on the page. */
.skip-link {
  position: fixed;
  z-index: 50;
  top: max(0.75rem, env(safe-area-inset-top, 0px));
  left: 50%;
  border-radius: 9999px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  translate: -50% -200%;
  transition: translate 0.2s;
}

.skip-link:focus {
  translate: -50% 0;
}

.credit {
  color: var(--color-ink-subtle);
  font-size: 0.8125rem;
  text-align: center;
}

@media (min-width: 900px) {
  .shell {
    gap: 1.375rem;
    padding-inline: 2rem;
    padding-top: 1.25rem;
    padding-bottom: 2.5rem;
  }

  .credit {
    text-align: right;
  }
}
</style>
