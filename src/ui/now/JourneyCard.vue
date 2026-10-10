<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconChevronRight from '~icons/tabler/chevron-right'

import { ridesOf } from '@/domain/journey'
import type { Endpoints } from '@/domain/route'
import { transferRiskOf } from '@/domain/transfer'
import type { Trip } from '@/domain/trip'

import GlassCard from '../components/GlassCard.vue'
import { useFormat } from '../composables/use-format'
import ItineraryBar from './ItineraryBar.vue'
import { segmentsOf } from './itinerary'
import TransferRiskTag from './TransferRiskTag.vue'
import TripTimeline from './TripTimeline.vue'

const props = defineProps<{ trip: Trip; ends: Endpoints }>()

const emit = defineEmits<{ details: [] }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()

const segments = computed(() => segmentsOf(props.trip, props.ends))
const risk = computed(() => transferRiskOf(props.trip.journey))

/** From leaving the place to arriving at the other one, with the number of transfers. */
const summary = computed(() => {
  const transfers = Math.max(0, ridesOf(props.trip.journey).length - 1)
  return t('now.journey.summary', {
    minutes: format.minutes(props.trip.arrivalAt - props.trip.leaveAt),
    transfers: t('now.journey.transfers', transfers),
  })
})
</script>

<template>
  <GlassCard tag="section" :aria-labelledby="headingId" class="flex flex-col gap-4">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 :id="headingId" class="text-lg font-semibold min-[900px]:text-xl">
        {{ t('now.journey.title') }}
      </h2>
      <span class="text-sm text-ink-subtle">{{ summary }}</span>
    </div>
    <TransferRiskTag v-if="risk !== 'ok'" :risk class="self-start" />
    <ItineraryBar :segments />
    <TripTimeline :trip :ends />
    <button type="button" class="more" @click="emit('details')">
      {{ t('now.journey.allStops') }}
      <IconChevronRight aria-hidden="true" />
    </button>
  </GlassCard>
</template>

<style scoped>
.more {
  display: flex;
  min-height: 3rem;
  align-items: center;
  justify-content: space-between;
  margin: -0.25rem -0.5rem -0.5rem;
  border-radius: 0.875rem;
  padding-inline: 0.5rem;
  color: var(--color-accent);
  font-weight: 600;
  transition: background-color 0.2s;
}

.more:hover {
  background: var(--color-press);
}
</style>
