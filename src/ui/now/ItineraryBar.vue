<script setup lang="ts">
import IconWalk from '~icons/tabler/walk'

import type { TransportMode } from '@/domain/journey'
import { MINUTE } from '@/domain/time'

import { modeIcon } from '../components/mode-icon'
import type { Segment } from './itinerary'

// A bar with one part per segment, as wide as it lasts. The timeline below tells the same
// in words, so the bar is hidden from screen readers.

defineProps<{ segments: readonly Segment[] }>()

const tone = (mode: TransportMode): string => {
  if (mode === 'train') return 'train'
  if (mode === 'bus' || mode === 'tram') return 'road'
  return 'other'
}
</script>

<template>
  <div class="bar" aria-hidden="true">
    <span
      v-for="(segment, index) in segments"
      :key="index"
      class="segment"
      :class="segment.kind === 'ride' ? ['ride', tone(segment.leg.line.mode)] : segment.kind"
      :style="{ flexGrow: segment.duration / MINUTE }"
    >
      <template v-if="segment.kind === 'ride'">
        <component :is="modeIcon(segment.leg.line.mode)" class="flex-none" />
        <span class="truncate">{{ segment.leg.line.name }}</span>
      </template>
      <IconWalk v-else-if="segment.kind === 'walk'" class="flex-none" />
    </span>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  height: 1.75rem;
  gap: 3px;
  font-size: 0.75rem;
}

.segment {
  display: flex;
  min-width: 1rem;
  flex-basis: 0;
  align-items: center;
  justify-content: center;
  gap: 0.3em;
  overflow: hidden;
  border-radius: 0.5rem;
  font-weight: 650;
  white-space: nowrap;
}

.walk {
  background: var(--color-buffer);
  color: var(--color-ink-subtle);
}

.buffer,
.wait {
  background: repeating-linear-gradient(135deg, var(--color-buffer) 0 4px, transparent 4px 8px);
}

.ride {
  min-width: 2.75rem;
  padding-inline: 0.4em;
  background: var(--tone);
  color: var(--color-on-vehicle);
}

.train {
  --tone: var(--color-train);
}

.road {
  --tone: var(--color-bus);
}

.other {
  --tone: var(--color-walk);
}

@media (min-width: 900px) {
  .bar {
    height: 2.125rem;
    gap: 4px;
    font-size: 0.8125rem;
  }

  .segment {
    border-radius: 0.625rem;
  }
}
</style>
