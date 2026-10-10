<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import IconSettings from '~icons/tabler/settings'

import BrandMark from '../components/BrandMark.vue'
import { useDialog } from '../composables/use-dialog'
import { NAVIGATION } from './navigation'

// Loaded on first use, which keeps the start of the app lean.
const SettingsDialog = defineAsyncComponent(() => import('../settings/SettingsDialog.vue'))

const { t } = useI18n()
const route = useRoute()

const settings = useDialog()
</script>

<template>
  <header class="top-bar flex items-center gap-4 sky-text">
    <RouterLink :to="{ name: 'now' }" class="brand mr-auto flex items-center gap-2.5 font-bold">
      <BrandMark class="size-8" />
      {{ t('app.name') }}
    </RouterLink>

    <nav
      :aria-label="t('nav.label')"
      class="desktop-nav hidden gap-1 rounded-full p-1 min-[900px]:flex"
    >
      <RouterLink
        v-for="item in NAVIGATION"
        :key="item.name"
        :to="{ name: item.name }"
        :aria-current="route.meta.section === item.name ? 'page' : undefined"
        class="desktop-tab flex min-h-10 items-center gap-2 rounded-full px-4 font-semibold"
      >
        <component :is="item.icon" aria-hidden="true" />
        {{ t(`nav.${item.name}`) }}
      </RouterLink>
    </nav>

    <button
      type="button"
      class="settings"
      :aria-label="t('settings.open')"
      :title="t('settings.open')"
      @click="settings.show"
    >
      <IconSettings aria-hidden="true" />
    </button>
    <SettingsDialog v-if="settings.used.value" v-model:open="settings.open.value" />
  </header>
</template>

<style scoped>
/* Everything here sits on the sky, so it is white in both appearances. */
.top-bar {
  min-height: 3rem;
  color: var(--color-on-sky);
}

.brand {
  font-size: 1.125rem;
  letter-spacing: -0.01em;
}

.desktop-nav {
  background: var(--color-sky-glass);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

.desktop-tab {
  font-size: 0.9375rem;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.desktop-tab:hover {
  background: var(--color-sky-glass);
}

.desktop-tab[aria-current='page'] {
  background: #ffffff;
  color: #14163a;
}

.dark .desktop-tab[aria-current='page'] {
  background: #f2f2ff;
  color: #0b0c2b;
}

.settings {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: none;
  place-items: center;
  border-radius: 0.875rem;
  font-size: 1.5rem;
  transition: background-color 0.2s;
}

.settings:hover {
  background: var(--color-sky-glass);
}

.settings:focus-visible,
.desktop-tab:focus-visible,
.brand:focus-visible {
  outline-color: var(--color-on-sky);
}
</style>
