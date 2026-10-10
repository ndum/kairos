<script setup lang="ts">
import { useId } from 'vue'

// A checkbox with the switch role, which screen readers announce as on or off.

const props = defineProps<{
  label: string
  hint?: string
  error?: string
  modelValue: boolean
  disabled?: boolean
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
  <div class="flex items-start justify-between gap-4">
    <div class="flex flex-col gap-1">
      <label :for="id" class="font-semibold">{{ label }}</label>
      <p v-if="hint" :id="`${id}-hint`" class="text-sm text-pretty text-ink-subtle">{{ hint }}</p>
      <p v-if="error" :id="`${id}-error`" class="text-sm font-medium text-late">{{ error }}</p>
    </div>
    <input
      :id
      type="checkbox"
      role="switch"
      class="switch"
      :checked="modelValue"
      :disabled
      :aria-describedby="
        [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
      "
      @change="request"
    />
  </div>
</template>

<style scoped>
.switch {
  position: relative;
  width: 3.25rem;
  height: 2rem;
  flex: none;
  cursor: pointer;
  appearance: none;
  border-radius: 9999px;
  background: var(--color-buffer);
  box-shadow: inset 0 0 0 1px var(--color-hairline);
  transition: background-color 0.25s;
}

.switch::before {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
  content: '';
  transition: translate 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.switch:checked {
  background: var(--color-go);
}

.switch:checked::before {
  translate: 1.25rem 0;
}

.switch:disabled {
  cursor: wait;
  opacity: 0.6;
}

.switch:focus-visible {
  outline: 2px solid var(--color-train);
  outline-offset: 3px;
}
</style>
