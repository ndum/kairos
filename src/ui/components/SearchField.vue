<script setup lang="ts" generic="T extends object">
import { computed, ref, useId, watch } from 'vue'
import IconLoader from '~icons/tabler/loader-2'
import IconSearch from '~icons/tabler/search'

import type { SearchStatus } from '../composables/use-search'

// A combobox following the WAI-ARIA pattern "list autocomplete with automatic selection":
// the first result is highlighted, Enter takes the highlighted one. The parent searches.

const model = defineModel<T | null>({ required: true })

const props = defineProps<{
  label: string
  error?: string
  hint?: string
  placeholder?: string
  results: readonly T[]
  status: SearchStatus
  keyOf: (item: T) => string
  textOf: (item: T) => string
  /** Read out or shown below the field: nothing found, failed, or the number of results. */
  messages: { noResults: string; failed: string; found: (count: number) => string }
}>()

const emit = defineEmits<{ search: [text: string] }>()

defineSlots<{ option(props: { item: T }): unknown }>()

const id = useId()
const listId = `${id}-list`
const optionId = (index: number): string => `${id}-option-${index}`

const text = ref(model.value ? props.textOf(model.value) : '')
const expanded = ref(false)
const active = ref(-1)

const showList = computed(
  () => expanded.value && props.status === 'done' && props.results.length > 0,
)

const message = computed(() => {
  if (!expanded.value) return ''
  if (props.status === 'failed') return props.messages.failed
  if (props.status !== 'done') return ''
  return props.results.length === 0
    ? props.messages.noResults
    : props.messages.found(props.results.length)
})

const describedBy = computed(
  () =>
    [props.hint && `${id}-hint`, props.error && `${id}-error`].filter(Boolean).join(' ') ||
    undefined,
)

watch(model, (item) => {
  if (item && props.textOf(item) !== text.value) text.value = props.textOf(item)
})

watch(
  () => props.results,
  (items) => {
    active.value = items.length > 0 ? 0 : -1
  },
)

function onInput(): void {
  if (model.value) model.value = null
  expanded.value = true
  emit('search', text.value)
}

function choose(item: T): void {
  model.value = item
  text.value = props.textOf(item)
  expanded.value = false
}

function onKeydown(event: KeyboardEvent): void {
  const count = props.results.length
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp': {
      event.preventDefault()
      expanded.value = true
      if (count === 0) return
      const offset = event.key === 'ArrowDown' ? 1 : -1
      active.value = (active.value + offset + count) % count
      return
    }
    case 'Enter': {
      const item = showList.value ? props.results[active.value] : undefined
      if (item === undefined) return
      event.preventDefault()
      choose(item)
      return
    }
    case 'Escape':
      if (!expanded.value) return
      event.preventDefault()
      expanded.value = false
  }
}
</script>

<template>
  <div class="relative flex flex-col gap-2">
    <label :for="id" class="font-semibold">{{ label }}</label>
    <p v-if="hint" :id="`${id}-hint`" class="-mt-1 text-sm text-pretty text-ink-subtle">
      {{ hint }}
    </p>
    <div class="relative">
      <IconSearch
        aria-hidden="true"
        class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-ink-subtle"
      />
      <input
        :id
        v-model="text"
        type="text"
        role="combobox"
        class="field pr-11 pl-11"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="search"
        aria-autocomplete="list"
        :aria-expanded="showList"
        :aria-controls="listId"
        :aria-activedescendant="showList && active >= 0 ? optionId(active) : undefined"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        :placeholder
        @input="onInput"
        @keydown="onKeydown"
        @blur="expanded = false"
      />
      <IconLoader
        v-if="status === 'searching'"
        aria-hidden="true"
        class="absolute top-1/2 right-4 -translate-y-1/2 animate-spin text-lg text-ink-subtle"
      />
    </div>

    <ul
      v-show="showList"
      :id="listId"
      role="listbox"
      :aria-label="label"
      class="listbox absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-inner p-1.5"
    >
      <li
        v-for="(item, index) in results"
        :id="optionId(index)"
        :key="keyOf(item)"
        role="option"
        :aria-selected="index === active"
        class="option flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
        @mousedown.prevent
        @mousemove="active = index"
        @click="choose(item)"
      >
        <slot name="option" :item />
      </li>
    </ul>

    <p v-if="error" :id="`${id}-error`" class="text-sm font-medium text-late">{{ error }}</p>
    <p role="status" class="text-sm text-ink-subtle" :class="{ 'sr-only': showList || !message }">
      {{ message }}
    </p>
  </div>
</template>

<style scoped>
/* Nearly opaque, so the fields below do not show through the results. */
.listbox {
  border: 1px solid var(--color-edge-faint);
  background: var(--color-popover);
  box-shadow: var(--shadow-glass);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  backdrop-filter: blur(24px) saturate(160%);
}

.option[aria-selected='true'] {
  background: color-mix(in srgb, var(--color-train) 14%, transparent);
}
</style>
