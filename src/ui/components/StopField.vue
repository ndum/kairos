<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import IconLoader from '~icons/tabler/loader-2'
import IconMapPin from '~icons/tabler/map-pin'
import IconSearch from '~icons/tabler/search'

import type { StopRef } from '@/domain/route'

import { useStopSearch } from '../composables/use-stop-search'

// A combobox following the WAI-ARIA pattern "list autocomplete with automatic selection":
// the first stop found is highlighted, Enter takes the highlighted stop.

const model = defineModel<StopRef | null>({ required: true })

const props = defineProps<{
  label: string
  error?: string
  placeholder?: string
}>()

const { t } = useI18n()
const id = useId()
const listId = `${id}-list`
const optionId = (index: number): string => `${id}-option-${index}`

const text = ref(model.value?.name ?? '')
const expanded = ref(false)
const active = ref(-1)
const { results, status, search } = useStopSearch()

const showList = computed(
  () => expanded.value && status.value === 'done' && results.value.length > 0,
)

/** Shown when nothing was found or the search failed. The number of stops is only read out. */
const message = computed(() => {
  if (!expanded.value) return ''
  if (status.value === 'failed') return t('stopField.failed')
  if (status.value !== 'done') return ''
  return results.value.length === 0
    ? t('stopField.noResults')
    : t('stopField.found', results.value.length)
})

const describedBy = computed(() => (props.error ? `${id}-error` : undefined))

watch(model, (stop) => {
  if (stop && stop.name !== text.value) text.value = stop.name
})

watch(results, (stops) => {
  active.value = stops.length > 0 ? 0 : -1
})

function onInput(): void {
  if (model.value) model.value = null
  expanded.value = true
  search(text.value)
}

function choose(stop: StopRef): void {
  model.value = stop
  text.value = stop.name
  expanded.value = false
}

function onKeydown(event: KeyboardEvent): void {
  const count = results.value.length
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
      const stop = showList.value ? results.value[active.value] : undefined
      if (!stop) return
      event.preventDefault()
      choose(stop)
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
        v-for="(stop, index) in results"
        :id="optionId(index)"
        :key="stop.id"
        role="option"
        :aria-selected="index === active"
        class="option flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
        @mousedown.prevent
        @mousemove="active = index"
        @click="choose(stop)"
      >
        <IconMapPin aria-hidden="true" class="flex-none text-ink-subtle" />
        {{ stop.name }}
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
