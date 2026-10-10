<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconArrowRight from '~icons/tabler/arrow-right'

import type { Endpoints } from '@/domain/route'

defineProps<{ ends: Endpoints }>()

const { t } = useI18n()
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
    {{ ends.origin.name }}
    <IconArrowRight aria-hidden="true" class="flex-none" />
    <span class="sr-only">{{ t('now.to') }}</span>
    {{ ends.destination.name }}
  </span>
</template>
