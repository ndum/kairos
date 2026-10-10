<script setup lang="ts" generic="T extends string">
import { useId } from 'vue'

// A group of radio buttons that looks like a segmented control. Arrow keys move between the
// options, as with any radio group.

const model = defineModel<T>({ required: true })

defineProps<{
  label: string
  options: readonly { value: T; label: string }[]
}>()

const name = useId()
</script>

<template>
  <fieldset class="flex flex-col gap-2">
    <legend class="mb-2 font-semibold">{{ label }}</legend>
    <div class="segments grid auto-cols-fr grid-flow-col gap-1 rounded-full p-1">
      <label v-for="option in options" :key="option.value" class="segment">
        <input v-model="model" type="radio" :name :value="option.value" class="sr-only" />
        {{ option.label }}
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.segments {
  border: 1px solid var(--color-hairline);
  background: var(--color-glass-soft);
}

.segment {
  display: flex;
  min-height: 2.5rem;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  padding-inline: 0.75rem;
  color: var(--color-ink-muted);
  font-size: 0.9375rem;
  font-weight: 600;
  text-align: center;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.segment:has(input:checked) {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.segment:has(input:focus-visible) {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
