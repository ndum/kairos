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
    class="tab-bar glass fixed inset-x-4 z-20 grid grid-cols-3 rounded-[1.75rem] p-1.5 min-[900px]:hidden"
  >
    <RouterLink
      v-for="item in NAVIGATION"
      :key="item.name"
      :to="{ name: item.name }"
      :aria-current="route.meta.section === item.name ? 'page' : undefined"
      class="tab flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[1.375rem] text-xs font-semibold text-ink-subtle"
    >
      <component :is="item.icon" aria-hidden="true" class="text-[1.375rem]" />
      {{ t(`nav.${item.name}`) }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.tab-bar {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 0.75rem);
}

.tab {
  transition:
    background-color 0.3s,
    color 0.3s;
}

.tab[aria-current='page'] {
  background: var(--color-glass);
  color: var(--color-ink);
  box-shadow: inset 0 1px 0 var(--color-highlight);
}
</style>
