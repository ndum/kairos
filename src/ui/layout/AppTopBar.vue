<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import IconSettings from '~icons/tabler/settings'

import BrandMark from '../components/BrandMark.vue'
import IconButton from '../components/IconButton.vue'
import { useDialog } from '../composables/use-dialog'
import { NAVIGATION } from './navigation'

// Loaded on first use, which keeps the start of the app lean.
const SettingsDialog = defineAsyncComponent(() => import('../settings/SettingsDialog.vue'))

const { t } = useI18n()
const route = useRoute()

const settings = useDialog()
</script>

<template>
  <header class="flex flex-wrap items-center gap-3">
    <RouterLink
      :to="{ name: 'now' }"
      class="mr-auto flex items-center gap-2.5 text-[clamp(1.125rem,min(1.1vw,2vh),1.75rem)] font-bold tracking-tight text-ink"
    >
      <BrandMark class="size-[1.75em]" />
      {{ t('app.name') }}
    </RouterLink>

    <nav
      :aria-label="t('nav.label')"
      class="glass hidden h-[clamp(2.5rem,min(2.4vw,4.6vh),3.25rem)] items-center gap-0.5 rounded-full p-1 min-[900px]:flex"
    >
      <RouterLink
        v-for="item in NAVIGATION"
        :key="item.name"
        :to="{ name: item.name }"
        :aria-current="route.meta.section === item.name ? 'page' : undefined"
        class="desktop-tab flex h-full items-center gap-2 rounded-full px-4 font-semibold text-ink-muted"
      >
        <component :is="item.icon" aria-hidden="true" />
        {{ t(`nav.${item.name}`) }}
      </RouterLink>
    </nav>

    <IconButton :label="t('settings.open')" class="glass" @click="settings.show">
      <IconSettings aria-hidden="true" />
    </IconButton>
    <SettingsDialog v-if="settings.used.value" v-model:open="settings.open.value" />
  </header>
</template>

<style scoped>
.desktop-tab {
  font-size: clamp(0.875rem, min(0.85vw, 1.6vh), 1.25rem);
  transition:
    background-color 0.3s,
    color 0.3s;
}

.desktop-tab:hover {
  color: var(--color-ink);
}

.desktop-tab[aria-current='page'] {
  background: var(--color-glass);
  color: var(--color-ink);
  box-shadow:
    inset 0 1px 0 var(--color-highlight),
    0 6px 16px -8px rgb(20 22 58 / 0.45);
}
</style>
