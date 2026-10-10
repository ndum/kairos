<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import BrandMark from '../components/BrandMark.vue'
import { NAVIGATION } from './navigation'

const { t } = useI18n()
const route = useRoute()
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

    <slot />
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
