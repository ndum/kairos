<script setup lang="ts">
defineProps<{
  /** Accessible name, also shown as a tooltip. */
  label: string
  disabled?: boolean
}>()
</script>

<template>
  <button type="button" class="icon-button" :aria-label="label" :title="label" :disabled>
    <slot />
  </button>
</template>

<style scoped>
.icon-button {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: none;
  place-items: center;
  border-radius: 9999px;
  color: var(--color-ink-muted);
  font-size: 1.25rem;
  transition:
    background-color 0.2s,
    color 0.2s,
    opacity 0.2s;
}

.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

@media (hover: hover) {
  .icon-button:not(:disabled):hover {
    background: var(--color-glass-soft);
    color: var(--color-ink);
  }
}
</style>
