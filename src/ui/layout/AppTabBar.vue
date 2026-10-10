<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { NAVIGATION } from './navigation'

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <nav
    :aria-label="t('nav.label')"
    class="tab-bar fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 gap-1 min-[900px]:hidden"
  >
    <RouterLink
      v-for="item in NAVIGATION"
      :key="item.name"
      :to="{ name: item.name }"
      :aria-current="route.meta.section === item.name ? 'page' : undefined"
      class="tab flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-[0.875rem] text-xs font-semibold"
    >
      <component :is="item.icon" aria-hidden="true" class="text-2xl" />
      {{ t(`nav.${item.name}`) }}
    </RouterLink>
  </nav>
</template>

<style scoped>
/* An opaque bar, so nothing of the page shows through it. */
.tab-bar {
  border-top: 1px solid var(--color-hairline);
  padding: 0.5rem 0.875rem calc(env(safe-area-inset-bottom, 0px) + 0.5rem);
  background: var(--color-bar);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
}

.tab {
  color: var(--color-ink-subtle);
  transition:
    background-color 0.2s,
    color 0.2s;
}

.tab:hover {
  background: var(--color-press);
}

.tab[aria-current='page'] {
  color: var(--color-accent);
}
</style>
