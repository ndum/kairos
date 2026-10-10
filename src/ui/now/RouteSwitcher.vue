<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { computed, ref, useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCheck from '~icons/tabler/check'
import IconChevronDown from '~icons/tabler/chevron-down'

import type { Route } from '@/domain/route'

// The route as a title that unfolds a list of all routes. The list is a group of radio
// buttons, so the arrow keys move between the routes; Escape or a click outside closes it.

const props = withDefaults(
  defineProps<{
    routes: readonly Route[]
    selected: string
    /** On the sky the title is large and white, in a card it uses the ink colour. */
    variant?: 'sky' | 'card'
  }>(),
  { variant: 'sky' },
)

const emit = defineEmits<{ select: [id: string] }>()

const { t } = useI18n()
const id = useId()
const open = ref(false)
const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')

const current = computed(() => props.routes.find((route) => route.id === props.selected))

onClickOutside(root, () => {
  open.value = false
})

function close(): void {
  if (!open.value) return
  open.value = false
  trigger.value?.focus()
}

/** A tap or click on a route closes the list. The arrow keys only move the choice. */
function closeOnPointer(event: MouseEvent): void {
  if (event.detail > 0) close()
}
</script>

<template>
  <div ref="root" class="switcher relative max-w-full" :class="variant" @keydown.esc="close">
    <button
      ref="trigger"
      type="button"
      class="title"
      :aria-expanded="open"
      :aria-controls="`${id}-routes`"
      @click="open = !open"
    >
      <span class="sr-only">{{ t('now.routeChoice') }}:</span>
      <span class="truncate">{{ current?.name }}</span>
      <IconChevronDown
        aria-hidden="true"
        class="flex-none transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>
    <fieldset v-show="open" :id="`${id}-routes`" class="menu">
      <legend class="sr-only">{{ t('now.routeChoice') }}</legend>
      <label v-for="route in routes" :key="route.id" class="option" @click="closeOnPointer">
        <input
          type="radio"
          class="sr-only"
          :name="id"
          :value="route.id"
          :checked="route.id === selected"
          @change="emit('select', route.id)"
        />
        <span class="flex-1 truncate">{{ route.name }}</span>
        <IconCheck v-if="route.id === selected" aria-hidden="true" class="text-accent" />
      </label>
    </fieldset>
  </div>
</template>

<style scoped>
.title {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.375rem;
  border-radius: 0.75rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.sky .title {
  color: var(--color-on-sky);
  font-size: 1.375rem;
}

.sky .title:focus-visible {
  outline-color: var(--color-on-sky);
}

.card .title {
  font-size: 1.25rem;
}

/* The list floats above the page in the colours of a card, also on the sky. */
.menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 0.5rem);
  left: 0;
  width: max-content;
  min-width: 14rem;
  max-width: min(22rem, calc(100vw - 2rem));
  border-radius: 1rem;
  padding: 0.375rem;
  background: var(--color-popover);
  box-shadow: var(--shadow-glass);
  color: var(--color-ink);
  text-shadow: none;
}

.option {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.75rem;
  padding-inline: 0.75rem;
  cursor: pointer;
  font-size: 1rem;
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

@media (min-width: 900px) {
  .sky .title {
    font-size: 2.125rem;
    letter-spacing: -0.02em;
  }
}
</style>
