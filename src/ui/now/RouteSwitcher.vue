<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Route } from '@/domain/route'

// The routes as a row of radio buttons styled as chips. Arrow keys switch the route.

defineProps<{ routes: readonly Route[]; selected: string }>()

const emit = defineEmits<{ select: [id: string] }>()

const { t } = useI18n()
const name = useId()
</script>

<template>
  <fieldset class="min-w-0">
    <legend class="sr-only">{{ t('now.routeChoice') }}</legend>
    <div class="choices flex gap-2 overflow-x-auto p-1">
      <label v-for="route in routes" :key="route.id" class="choice glass">
        <input
          type="radio"
          class="sr-only"
          :name
          :value="route.id"
          :checked="route.id === selected"
          @change="emit('select', route.id)"
        />
        {{ route.name }}
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
/* Scrolls sideways on narrow screens, without a visible scrollbar. */
.choices {
  scrollbar-width: none;
}

.choices::-webkit-scrollbar {
  display: none;
}

.choice {
  display: inline-flex;
  min-height: 2.75rem;
  flex: none;
  cursor: pointer;
  align-items: center;
  border-radius: 9999px;
  padding-inline: 1.1rem;
  color: var(--color-ink-muted);
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.choice:has(input:checked) {
  background: var(--color-ink);
  color: var(--color-on-ink);
}

.choice:has(input:focus-visible) {
  outline: 2px solid var(--color-train);
  outline-offset: 2px;
}
</style>
