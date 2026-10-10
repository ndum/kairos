<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconRefresh from '~icons/tabler/refresh'

import type { MonitorSnapshot } from '@/application/trip-monitor'

import IconButton from '../components/IconButton.vue'
import { useFormat } from '../composables/use-format'

const props = defineProps<{ snapshot: MonitorSnapshot }>()

const emit = defineEmits<{ refresh: [] }>()

const { t } = useI18n()
const format = useFormat()

const state = computed(() => t(`now.live.${props.snapshot.status}`))
const offline = computed(
  () => props.snapshot.status === 'stale' || props.snapshot.status === 'error',
)
</script>

<template>
  <div
    class="live glass flex h-10 items-center gap-2 rounded-full pr-1 pl-4 text-sm"
    :class="snapshot.status"
  >
    <i class="dot" aria-hidden="true" />
    <b class="font-bold" aria-hidden="true">{{ state }}</b>
    <span v-if="snapshot.fetchedAt" class="text-ink-muted">
      {{ t('now.live.updated', { time: format.time(snapshot.fetchedAt) }) }}
    </span>
    <IconButton
      v-if="offline"
      class="-my-1"
      :label="t('now.live.refresh')"
      @click="emit('refresh')"
    >
      <IconRefresh aria-hidden="true" />
    </IconButton>
    <span v-else class="w-3" />
    <!-- Only changes of the state are read out, not every refresh. -->
    <span class="sr-only" role="status">{{ state }}</span>
  </div>
</template>

<style scoped>
.dot {
  position: relative;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--color-go);
}

/* A ring that spreads from the dot while the data is live. */
.dot::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: inherit;
  animation: ping 2.4s ease-out infinite;
  content: '';
}

.loading .dot {
  background: var(--color-ink-subtle);
}

.stale .dot,
.error .dot {
  background: var(--color-soon);
}

.loading .dot::after,
.stale .dot::after,
.error .dot::after {
  animation: none;
}

@keyframes ping {
  from {
    opacity: 0.6;
    transform: scale(1);
  }

  80%,
  to {
    opacity: 0;
    transform: scale(2.8);
  }
}
</style>
