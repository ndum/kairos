<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconArrowRight from '~icons/tabler/arrow-right'

import type { Endpoints } from '@/domain/route'

defineProps<{ ends: Endpoints }>()

const { t } = useI18n()
</script>

<template>
  <span
    class="direction-tag inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold"
  >
    {{ ends.origin.name }}
    <IconArrowRight aria-hidden="true" />
    <span class="sr-only">{{ t('now.to') }}</span>
    {{ ends.destination.name }}
  </span>
</template>

<style scoped>
.direction-tag {
  background: var(--color-glass-soft);
  box-shadow: inset 0 0 0 1px var(--color-hairline);
}
</style>
