<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    tag?: string
    /** Raises the card slightly on hover. Off for forms, which should stay in place. */
    lift?: boolean
  }>(),
  { tag: 'section', lift: true },
)

// A light spot follows the mouse across the card, like a reflection on glass.
const spot = ref<{ x: string; y: string } | null>(null)

function follow(event: PointerEvent): void {
  if (event.pointerType !== 'mouse') return
  const card = event.currentTarget as HTMLElement
  const box = card.getBoundingClientRect()
  spot.value = { x: `${event.clientX - box.left}px`, y: `${event.clientY - box.top}px` }
}
</script>

<template>
  <component
    :is="tag"
    class="glass-card glass rounded-card"
    :class="{ lift }"
    :style="spot ? { '--spot-x': spot.x, '--spot-y': spot.y } : undefined"
    @pointermove="follow"
    @pointerleave="spot = null"
  >
    <slot />
  </component>
</template>

<style scoped>
.glass-card {
  min-width: 0;
  padding: clamp(1.25rem, 1.8vw, 3rem);
  animation: rise 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.glass-card::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    560px circle at var(--spot-x, 50%) var(--spot-y, -40%),
    var(--color-spotlight),
    transparent 45%
  );
  opacity: 0;
  transition: opacity 0.5s;
  pointer-events: none;
}

@media (hover: hover) {
  .glass-card.lift:hover {
    transform: translateY(-3px);
  }

  .glass-card:hover::after {
    opacity: 1;
  }
}

@keyframes rise {
  from {
    opacity: 0.2;
    transform: translateY(22px) scale(0.98);
  }
}
</style>
