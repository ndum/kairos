<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue'

import { useToastStore } from '../stores/toasts'

/** Time a toast stays visible. It waits while the pointer or focus is on it. */
const VISIBLE_FOR = 6000

const toasts = useToastStore()
const paused = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function schedule(): void {
  clearTimeout(timer)
  const toast = toasts.current
  if (!toast || paused.value) return
  timer = setTimeout(() => {
    toasts.dismiss(toast.id)
  }, VISIBLE_FOR)
}

watch([() => toasts.current, paused], schedule)
onScopeDispose(() => {
  clearTimeout(timer)
})

function runAction(): void {
  const toast = toasts.current
  if (!toast?.action) return
  toast.action.run()
  toasts.dismiss(toast.id)
}
</script>

<template>
  <div class="toast-region fixed inset-x-4 z-40 flex justify-center" role="status">
    <Transition name="toast">
      <div
        v-if="toasts.current"
        :key="toasts.current.id"
        class="glass flex max-w-lg items-center gap-4 rounded-2xl py-2 pr-2 pl-5 font-medium"
        @pointerenter="paused = true"
        @pointerleave="paused = false"
        @focusin="paused = true"
        @focusout="paused = false"
      >
        <span class="py-2">{{ toasts.current.message }}</span>
        <button
          v-if="toasts.current.action"
          type="button"
          class="action ml-auto flex-none rounded-xl px-4 py-2 font-semibold"
          @click="runAction"
        >
          {{ toasts.current.action.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-region {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 6.5rem);
  pointer-events: none;
}

.toast-region > * {
  pointer-events: auto;
}

.action {
  background: var(--color-glass);
  color: var(--color-train);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.3s,
    transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(1rem) scale(0.97);
}

@media (min-width: 900px) {
  .toast-region {
    bottom: 2.5rem;
  }
}
</style>
