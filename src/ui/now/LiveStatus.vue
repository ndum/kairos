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
  <div class="live pill" :class="[snapshot.status, { 'pr-1': offline }]">
    <i class="dot" aria-hidden="true" />
    <b class="font-semibold" aria-hidden="true">{{ state }}</b>
    <span v-if="snapshot.fetchedAt" class="opacity-85">
      {{ t('now.live.updated', { time: format.time(snapshot.fetchedAt) }) }}
    </span>
    <IconButton
      v-if="offline"
      class="refresh -my-1"
      :label="t('now.live.refresh')"
      @click="emit('refresh')"
    >
      <IconRefresh aria-hidden="true" />
    </IconButton>
    <!-- Only changes of the state are read out, not every refresh. -->
    <span class="sr-only" role="status">{{ state }}</span>
  </div>
</template>

<style scoped>
/* White text on the sky, so the dot uses the bright green of the night in both looks. */
.dot {
  position: relative;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #62df99;
}

.refresh {
  color: inherit;
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
  background: rgb(255 255 255 / 0.6);
}

.stale .dot,
.error .dot {
  background: #ffc447;
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
