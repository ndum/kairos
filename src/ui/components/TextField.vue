<script setup lang="ts">
import { computed, useId } from 'vue'

const model = defineModel<string>({ required: true })

const props = defineProps<{
  label: string
  hint?: string
  error?: string
  placeholder?: string
  maxlength?: number
}>()

const id = useId()
const describedBy = computed(
  () =>
    [props.hint && `${id}-hint`, props.error && `${id}-error`].filter(Boolean).join(' ') ||
    undefined,
)
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="id" class="font-semibold">{{ label }}</label>
    <input
      :id
      v-model="model"
      type="text"
      class="field"
      autocomplete="off"
      :placeholder
      :maxlength
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
    />
    <p v-if="error" :id="`${id}-error`" class="text-sm font-medium text-late">{{ error }}</p>
    <p v-if="hint" :id="`${id}-hint`" class="text-sm text-ink-subtle">{{ hint }}</p>
    <slot />
  </div>
</template>
