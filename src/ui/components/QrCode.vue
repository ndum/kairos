<script setup lang="ts">
import { shallowRef, watch } from 'vue'

import { qrPath } from './qr-path'

const props = defineProps<{
  value: string
  /** Describes the code for screen readers. */
  label: string
}>()

/** Light modules around the code, which scanners need to find it. */
const QUIET_ZONE = 4

const code = shallowRef<{ path: string; size: number } | null>(null)

// The generator is only loaded when a code is shown.
watch(
  () => props.value,
  async (value) => {
    const { generate } = await import('lean-qr/nano')
    const modules = generate(value)
    code.value = { path: qrPath(modules), size: modules.size }
  },
  { immediate: true },
)
</script>

<template>
  <svg
    v-if="code"
    role="img"
    :aria-label="label"
    :viewBox="`${-QUIET_ZONE} ${-QUIET_ZONE} ${code.size + 2 * QUIET_ZONE} ${code.size + 2 * QUIET_ZONE}`"
    shape-rendering="crispEdges"
    class="qr-code"
  >
    <rect
      :x="-QUIET_ZONE"
      :y="-QUIET_ZONE"
      :width="code.size + 2 * QUIET_ZONE"
      :height="code.size + 2 * QUIET_ZONE"
      rx="2"
      class="paper"
    />
    <path :d="code.path" class="modules" />
  </svg>
  <div v-else class="qr-code placeholder" />
</template>

<style scoped>
.qr-code {
  width: 100%;
  aspect-ratio: 1;
}

/* Dark on light in both themes, which every scanner reads reliably. */
.paper {
  fill: #ffffff;
}

.modules {
  fill: #14163a;
}

.placeholder {
  border-radius: var(--radius-inner);
  background: var(--color-glass-soft);
}
</style>
