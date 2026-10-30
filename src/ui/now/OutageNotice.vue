<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '~icons/tabler/alert-triangle'

import GlassCard from '../components/GlassCard.vue'

// Shown while the device is online but the timetable fails to answer, so an empty or old
// board does not look like there are no trips.

defineProps<{ stale: boolean }>()

const { t } = useI18n()
const titleId = useId()
</script>

<template>
  <GlassCard tag="section" :aria-labelledby="titleId" class="outage flex gap-3">
    <IconAlertTriangle aria-hidden="true" class="icon mt-0.5 flex-none" />
    <div class="flex min-w-0 flex-col gap-1">
      <h2 :id="titleId" class="font-semibold">{{ t('now.outage.title') }}</h2>
      <p class="text-ink-muted">
        {{ t('now.outage.text') }}
        <template v-if="stale">{{ t('now.outage.stale') }}</template>
      </p>
    </div>
  </GlassCard>
</template>

<style scoped>
.outage {
  padding: 1rem 1.25rem;
}

.icon {
  color: var(--color-soon);
  font-size: 1.25rem;
}
</style>
