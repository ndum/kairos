<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'sky'
    /** Renders a link to this location instead of a button. */
    to?: RouteLocationRaw
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'secondary', to: undefined, type: 'button' },
)
</script>

<template>
  <RouterLink v-if="to" :to class="button" :class="variant">
    <slot />
  </RouterLink>
  <button v-else :type :disabled class="button" :class="variant">
    <slot />
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 1rem;
  padding-inline: 1.125rem;
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
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.secondary {
  border: 1px solid var(--color-hairline);
  background: var(--color-card);
  color: var(--color-ink);
}

.quiet,
.danger,
.sky {
  padding-inline: 0.875rem;
}

/* A text button on the sky. */
.sky {
  color: var(--color-on-sky);
}

.quiet {
  color: var(--color-accent);
}

.danger {
  color: var(--color-late);
}

@media (hover: hover) {
  .primary:hover {
    background: color-mix(in srgb, var(--color-accent) 88%, var(--color-ink));
  }

  /* A tint over the surface, so the card colour stays underneath. */
  .secondary:hover {
    box-shadow: inset 0 0 0 999px var(--color-press);
  }

  .quiet:hover,
  .danger:hover {
    background: var(--color-press);
  }

  .sky:hover {
    background: var(--color-sky-glass);
  }
}
</style>
