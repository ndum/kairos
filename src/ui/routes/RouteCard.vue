<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconArrowDown from '~icons/tabler/arrow-down'
import IconArrowUp from '~icons/tabler/arrow-up'
import IconPencil from '~icons/tabler/pencil'
import IconTrash from '~icons/tabler/trash'

import type { Route } from '@/domain/route'
import { type Duration, MINUTE } from '@/domain/time'

import BaseButton from '../components/BaseButton.vue'
import GlassCard from '../components/GlassCard.vue'
import IconButton from '../components/IconButton.vue'
import LineBadge from '../components/LineBadge.vue'

defineProps<{
  route: Route
  /** Disables moving up or down at either end of the list. */
  first: boolean
  last: boolean
}>()

const emit = defineEmits<{ move: [offset: number]; remove: [] }>()

const { t } = useI18n()
const headingId = useId()

const inMinutes = (duration: Duration): number => Math.round(duration / MINUTE)
</script>

<template>
  <GlassCard tag="article" :aria-labelledby="headingId" class="flex h-full flex-col gap-5">
    <div class="flex items-start justify-between gap-3">
      <h2 :id="headingId" class="pt-2 text-xl font-semibold tracking-tight text-balance">
        {{ route.name }}
      </h2>
      <div class="-mr-2 flex">
        <IconButton
          :label="t('routes.moveUp', { name: route.name })"
          :disabled="first"
          @click="emit('move', -1)"
        >
          <IconArrowUp aria-hidden="true" />
        </IconButton>
        <IconButton
          :label="t('routes.moveDown', { name: route.name })"
          :disabled="last"
          @click="emit('move', 1)"
        >
          <IconArrowDown aria-hidden="true" />
        </IconButton>
      </div>
    </div>

    <ol class="flex flex-col gap-4">
      <li
        v-for="place in route.places"
        :key="place.stop.id"
        class="place relative grid grid-cols-[1rem_1fr] gap-x-3"
      >
        <span class="dot mt-1.5" aria-hidden="true" />
        <div class="min-w-0">
          <p class="font-semibold">{{ place.name }}</p>
          <p class="truncate text-ink-muted">{{ place.stop.name }}</p>
          <p class="text-sm text-ink-subtle">
            {{ t('routes.walk', { minutes: inMinutes(place.walk) }) }}
          </p>
          <template v-if="place.secondStop">
            <p class="truncate text-ink-muted">
              {{ t('routes.orStop', { stop: place.secondStop.stop.name }) }}
            </p>
            <p class="text-sm text-ink-subtle">
              {{ t('routes.walk', { minutes: inMinutes(place.secondStop.walk) }) }}
            </p>
          </template>
        </div>
      </li>
    </ol>

    <p class="text-sm text-ink-subtle">
      {{ t('routes.buffer', { minutes: inMinutes(route.buffer) }) }}
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <span class="mr-1 text-sm font-semibold text-ink-muted">{{ t('routes.lines') }}</span>
      <LineBadge
        v-for="line in route.preferredLines"
        :key="line.name"
        :name="line.name"
        :mode="line.mode"
      />
      <span v-if="route.preferredLines.length === 0" class="text-sm text-ink-subtle">
        {{ t('routes.allLines') }}
      </span>
    </div>

    <div class="mt-auto flex flex-wrap gap-2">
      <BaseButton
        :to="{ name: 'route-edit', params: { id: route.id } }"
        :aria-label="t('routes.editNamed', { name: route.name })"
      >
        <IconPencil aria-hidden="true" />
        {{ t('routes.edit') }}
      </BaseButton>
      <BaseButton
        variant="danger"
        :aria-label="t('routes.removeNamed', { name: route.name })"
        @click="emit('remove')"
      >
        <IconTrash aria-hidden="true" />
        {{ t('routes.remove') }}
      </BaseButton>
    </div>
  </GlassCard>
</template>

<style scoped>
.dot {
  width: 1rem;
  height: 1rem;
  border: 3px solid var(--color-ink);
  border-radius: 9999px;
  background: var(--color-glass);
}

.place:last-child .dot {
  background: var(--color-ink);
}

/* Connects the two places like a line on a timetable. */
.place:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 1.75rem;
  bottom: -0.875rem;
  left: calc(0.5rem - 1px);
  width: 2px;
  border-radius: 1px;
  background: var(--color-ink-subtle);
  opacity: 0.5;
}
</style>
