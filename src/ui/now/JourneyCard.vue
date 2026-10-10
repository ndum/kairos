<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Endpoints } from '@/domain/route'
import { transferRiskOf } from '@/domain/transfer'
import type { Trip } from '@/domain/trip'

import GlassCard from '../components/GlassCard.vue'
import ItineraryBar from './ItineraryBar.vue'
import { segmentsOf } from './itinerary'
import TransferRiskTag from './TransferRiskTag.vue'
import TripTimeline from './TripTimeline.vue'

const props = defineProps<{ trip: Trip; ends: Endpoints }>()

const { t } = useI18n()
const headingId = useId()

const segments = computed(() => segmentsOf(props.trip, props.ends.origin, props.ends.destination))
const risk = computed(() => transferRiskOf(props.trip.journey))
</script>

<template>
  <GlassCard tag="section" :lift="false" :aria-labelledby="headingId" class="flex flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 :id="headingId" class="text-xl font-semibold tracking-tight">
        {{ t('now.journey.title') }}
      </h2>
      <TransferRiskTag v-if="risk !== 'ok'" :risk />
    </div>
    <ItineraryBar :segments />
    <TripTimeline :trip :ends />
  </GlassCard>
</template>
