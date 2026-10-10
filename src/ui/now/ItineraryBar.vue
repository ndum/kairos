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
  height: clamp(2.75rem, 4.5vw, 4.5rem);
  gap: 4px;
}

.segment {
  display: flex;
  min-width: 1.25rem;
  flex-basis: 0;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  overflow: hidden;
  border-radius: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.segment:first-child {
  border-radius: 9999px 0.75rem 0.75rem 9999px;
}

.segment:last-child {
  border-radius: 0.75rem 9999px 9999px 0.75rem;
}

.walk {
  background:
    radial-gradient(circle, var(--color-walk) 0 1.6px, transparent 2.2px) 0 50% / 11px 100% repeat-x,
    var(--color-glass-soft);
  color: var(--color-ink-muted);
}

.buffer,
.wait {
  background:
    repeating-linear-gradient(135deg, var(--color-buffer) 0 4px, transparent 4px 9px),
    var(--color-glass-soft);
}

.ride {
  min-width: 3.25rem;
  padding-inline: 0.5em;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tone) 72%, #fff), var(--tone) 70%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.45),
    0 10px 24px -12px var(--tone);
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
</style>
