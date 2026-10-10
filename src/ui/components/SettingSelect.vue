<script setup lang="ts" generic="T extends string">
import { type Component, computed, ref, useId } from 'vue'
import IconCheck from '~icons/tabler/check'
import IconChevronRight from '~icons/tabler/chevron-right'

// A row of a settings list that shows the current choice and unfolds the options below it,
// as radio buttons, so the arrow keys move between them.

const model = defineModel<T>({ required: true })

const props = defineProps<{
  label: string
  options: readonly { value: T; label: string }[]
  icon?: Component
  /** Colour of the icon tile, one per group of settings. */
  tone?: 1 | 2 | 3
}>()

const id = useId()
const open = ref(false)
const current = computed(() => props.options.find((option) => option.value === model.value))
</script>

<template>
  <div>
    <button
      type="button"
      class="setting-row w-full text-left"
      :aria-expanded="open"
      :aria-controls="`${id}-options`"
      @click="open = !open"
    >
      <span v-if="icon" class="setting-tile" :class="`tone-${tone ?? 1}`" aria-hidden="true">
        <component :is="icon" />
      </span>
      <span class="flex-1 font-medium">{{ label }}</span>
      <span class="text-ink-subtle">{{ current?.label }}</span>
      <IconChevronRight
        aria-hidden="true"
        class="flex-none text-ink-subtle transition-transform"
        :class="{ 'rotate-90': open }"
      />
    </button>
    <fieldset v-show="open" :id="`${id}-options`" class="options">
      <legend class="sr-only">{{ label }}</legend>
      <label v-for="option in options" :key="option.value" class="option">
        <input v-model="model" type="radio" class="sr-only" :name="id" :value="option.value" />
        <span class="flex-1">{{ option.label }}</span>
        <IconCheck v-if="option.value === model" aria-hidden="true" class="text-accent" />
      </label>
    </fieldset>
  </div>
</template>

<style scoped>
.options {
  padding: 0 0.875rem 0.5rem 3.625rem;
}

.option {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.75rem;
  padding-inline: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.option:hover {
  background: var(--color-press);
}

.option:has(input:checked) {
  font-weight: 600;
}

.option:has(input:focus-visible) {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
</style>
