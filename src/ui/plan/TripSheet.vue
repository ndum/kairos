<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconPinned from '~icons/tabler/pinned'
import IconPinnedOff from '~icons/tabler/pinned-off'
import IconStar from '~icons/tabler/star'

import { ridesOf } from '@/domain/journey'
import type { Endpoints } from '@/domain/route'
import { transferRiskOf } from '@/domain/transfer'
import type { Trip } from '@/domain/trip'

import AppDialog from '../components/AppDialog.vue'
import BaseButton from '../components/BaseButton.vue'
import { useFormat } from '../composables/use-format'
import DirectionTag from '../now/DirectionTag.vue'
import ItineraryBar from '../now/ItineraryBar.vue'
import { segmentsOf } from '../now/itinerary'
import TransferRiskTag from '../now/TransferRiskTag.vue'
import TripTimeline from '../now/TripTimeline.vue'

// Details of a trip as a sheet: when it leaves and arrives, the bar, every step with the stops
// in between, and buttons to pin the trip or to prefer its lines.

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  trip: Trip
  ends: Endpoints
  pinned: boolean
  /** Offers to prefer the lines of the trip, unless the route already does. */
  canPrefer?: boolean
}>()

const emit = defineEmits<{ pin: []; unpin: []; prefer: [] }>()

const { t } = useI18n()
const format = useFormat()

const segments = computed(() => segmentsOf(props.trip, props.ends))

/** From leaving the place to arriving at the other one, with the number of transfers. */
const summary = computed(() => {
  const transfers = Math.max(0, ridesOf(props.trip.journey).length - 1)
  return t('plan.sheet.summary', {
    leave: format.time(props.trip.leaveAt),
    arrival: format.time(props.trip.arrivalAt),
    minutes: format.minutes(props.trip.arrivalAt - props.trip.leaveAt),
    transfers: t('now.journey.transfers', transfers),
  })
})
const risk = computed(() => transferRiskOf(props.trip.journey))
</script>

<template>
  <AppDialog
    v-model:open="open"
    :title="t('plan.sheet.title', { time: format.time(trip.leaveAt) })"
    placement="side"
  >
    <div class="-mt-3 flex flex-col gap-2">
      <DirectionTag :ends />
      <p class="text-ink-muted">{{ summary }}</p>
      <TransferRiskTag v-if="risk !== 'ok'" :risk class="self-start" />
    </div>
    <div class="steps flex flex-col gap-4">
      <ItineraryBar :segments />
      <TripTimeline :trip :ends />
    </div>
    <div class="grid grid-cols-2 gap-2.5">
      <BaseButton
        :variant="pinned ? 'secondary' : 'primary'"
        :class="{ 'col-span-2': !canPrefer }"
        @click="pinned ? emit('unpin') : emit('pin')"
      >
        <IconPinnedOff v-if="pinned" aria-hidden="true" />
        <IconPinned v-else aria-hidden="true" />
        {{ pinned ? t('plan.unpin') : t('plan.pin') }}
      </BaseButton>
      <BaseButton v-if="canPrefer" @click="emit('prefer')">
        <IconStar aria-hidden="true" />
        {{ t('plan.prefer') }}
      </BaseButton>
    </div>
  </AppDialog>
</template>

<style scoped>
.steps {
  border-radius: 1.125rem;
  padding: 1rem 0.875rem;
  background: var(--color-group);
}
</style>
