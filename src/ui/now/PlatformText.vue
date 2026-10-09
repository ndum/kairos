<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { StopEvent, TransportMode } from '@/domain/journey'

const props = defineProps<{ event: StopEvent; mode: TransportMode }>()

const { t } = useI18n()

// Trains stop at a track, buses and trams at a bay of the stop.
const kind = computed(() => (props.mode === 'train' ? 'track' : 'bay'))
</script>

<template>
  <span v-if="event.expectedPlatform" class="changed">
    {{ t(`now.platform.${kind}`, { platform: event.expectedPlatform }) }}
    <span v-if="event.platform" class="font-normal">
      {{ t('now.platform.instead', { platform: event.platform }) }}
    </span>
  </span>
  <span v-else-if="event.platform">{{
    t(`now.platform.${kind}`, { platform: event.platform })
  }}</span>
</template>

<style scoped>
.changed {
  color: var(--color-late);
  font-weight: 650;
}
</style>
