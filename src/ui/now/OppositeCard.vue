<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconArrowsExchange from '~icons/tabler/arrows-exchange'
import IconChevronRight from '~icons/tabler/chevron-right'

import type { Board } from '@/application/board'
import type { MonitorStatus } from '@/application/trip-monitor'
import type { Endpoints } from '@/domain/route'
import type { Trip } from '@/domain/trip'

import GlassCard from '../components/GlassCard.vue'
import { useFormat } from '../composables/use-format'
import DirectionTag from './DirectionTag.vue'

// The other direction in short: when to leave for its next trip, and a switch to it.

const props = defineProps<{
  board: Board
  ends: Endpoints
  status: MonitorStatus
}>()

const emit = defineEmits<{ swap: []; details: [trip: Trip] }>()

const { t } = useI18n()
const format = useFormat()
const directionId = useId()

const main = computed(() => props.board.main)
</script>

<template>
  <GlassCard tag="section" :aria-labelledby="directionId" class="opposite flex items-center gap-3">
    <div class="flex min-w-0 flex-1 flex-col items-start gap-1">
      <DirectionTag :id="directionId" :ends />
      <button v-if="main" type="button" class="next" @click="emit('details', main)">
        {{
          t('now.opposite.next', {
            leave: format.time(main.leaveAt),
            arrival: format.time(main.arrivalAt),
          })
        }}
        <IconChevronRight aria-hidden="true" class="flex-none text-ink-subtle" />
      </button>
      <p v-else class="text-ink-muted">
        {{ status === 'loading' ? t('now.loading') : t('now.noTrips') }}
      </p>
    </div>
    <button
      type="button"
      class="swap"
      :aria-label="t('now.swap')"
      :title="t('now.swap')"
      @click="emit('swap')"
    >
      <IconArrowsExchange aria-hidden="true" />
    </button>
  </GlassCard>
</template>

<style scoped>
.opposite {
  padding: 0.875rem 0.875rem 0.875rem 1.25rem;
}

.next {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.25rem;
  margin: -0.25rem -0.5rem;
  border-radius: 0.75rem;
  padding: 0.25rem 0.5rem;
  text-align: left;
  transition: background-color 0.2s;
}

.next:hover {
  background: var(--color-press);
}

.swap {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: none;
  place-items: center;
  border-radius: 0.875rem;
  background: var(--color-press);
  font-size: 1.25rem;
  transition: background-color 0.2s;
}

.swap:hover {
  background: var(--color-buffer);
}

@media (min-width: 900px) {
  .opposite {
    padding: 1.25rem 1.25rem 1.25rem 1.5rem;
  }
}
</style>
