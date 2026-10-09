<script setup lang="ts">
import { computed } from 'vue'

import type { TransportMode } from '@/domain/journey'

const props = defineProps<{ name: string; mode: TransportMode }>()

// Colour tells rail from road. Other modes stay neutral.
const tone = computed(() => {
  if (props.mode === 'train') return 'bg-train'
  if (props.mode === 'bus' || props.mode === 'tram') return 'bg-bus'
  return 'bg-walk'
})
</script>

<template>
  <span
    class="inline-flex h-7 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-on-vehicle tabular-nums"
    :class="tone"
  >
    {{ name }}
  </span>
</template>
