<script setup lang="ts">
import { type Component, useId } from 'vue'

// A row of a settings list with a checkbox in the role of a switch, which screen readers
// announce as on or off. The whole row toggles it.

const props = defineProps<{
  label: string
  hint?: string
  error?: string
  modelValue: boolean
  disabled?: boolean
  icon?: Component
  /** Colour of the icon tile, one per group of settings. */
  tone?: 1 | 2 | 3
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const id = useId()

/**
 * The switch only changes when the value does. A parent may refuse the change, for example
 * when the browser denies access to the position.
 */
function request(event: Event): void {
  const input = event.target as HTMLInputElement
  emit('update:modelValue', input.checked)
  input.checked = props.modelValue
}
</script>

<template>
  <label class="setting-row" :class="{ disabled }">
    <span v-if="icon" class="setting-tile" :class="`tone-${tone ?? 1}`" aria-hidden="true">
      <component :is="icon" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span :id="`${id}-label`" class="font-medium">{{ label }}</span>
      <span v-if="hint" :id="`${id}-hint`" class="text-sm text-pretty text-ink-subtle">
        {{ hint }}
      </span>
      <span v-if="error" :id="`${id}-error`" class="text-sm font-medium text-late">
        {{ error }}
      </span>
    </span>
    <input
      :id
      type="checkbox"
      role="switch"
      class="switch"
      :checked="modelValue"
      :disabled
      :aria-labelledby="`${id}-label`"
      :aria-describedby="
        [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
      "
      @change="request"
    />
  </label>
</template>

<style scoped>
.switch {
  position: relative;
  width: 3.1875rem;
  height: 1.9375rem;
  flex: none;
  cursor: pointer;
  appearance: none;
  border-radius: 9999px;
  background: var(--color-track);
  transition: background-color 0.2s;
}

.switch::before {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.6875rem;
  height: 1.6875rem;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 4px rgb(0 0 0 / 0.2);
  content: '';
  transition: translate 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.switch:checked {
  background: var(--color-go);
}

.switch:checked::before {
  translate: 1.25rem 0;
}

.switch:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

.disabled {
  cursor: default;
}

.disabled .switch {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
