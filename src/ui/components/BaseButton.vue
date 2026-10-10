<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
    /** Renders a link to this location instead of a button. */
    to?: RouteLocationRaw
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'secondary', to: undefined, type: 'button' },
)
</script>

<template>
  <RouterLink v-if="to" :to class="button" :class="[variant, { glass: variant === 'secondary' }]">
    <slot />
  </RouterLink>
  <button
    v-else
    :type
    :disabled
    class="button"
    :class="[variant, { glass: variant === 'secondary' }]"
  >
    <slot />
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 9999px;
  padding-inline: 1.25rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    transform 0.2s,
    background-color 0.2s,
    color 0.2s,
    opacity 0.2s;
}

.button:active {
  transform: scale(0.97);
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.primary {
  background: var(--color-ink);
  box-shadow: 0 12px 26px -14px rgb(20 22 58 / 0.7);
  color: var(--color-on-ink);
}

.secondary {
  color: var(--color-ink);
}

.quiet,
.danger {
  padding-inline: 1rem;
}

.quiet {
  color: var(--color-ink-muted);
}

.danger {
  color: var(--color-late);
}

@media (hover: hover) {
  .quiet:hover,
  .danger:hover {
    background: var(--color-glass-soft);
  }

  .quiet:hover {
    color: var(--color-ink);
  }
}
</style>
