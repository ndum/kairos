<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import IconListDetails from '~icons/tabler/list-details'
import IconTrain from '~icons/tabler/train'

import { currentJourney } from '@/application/pinned-trip'
import type { Ride } from '@/application/ride'
import type { MonitorSnapshot } from '@/application/trip-monitor'
import { type Journey, ridesOf } from '@/domain/journey'
import { type Route, endpoints, stopPairs } from '@/domain/route'
import type { Instant } from '@/domain/time'
import { planTrip } from '@/domain/trip'

import BaseButton from '../components/BaseButton.vue'
import GlassCard from '../components/GlassCard.vue'
import LineBadge from '../components/LineBadge.vue'
import { useDialog } from '../composables/use-dialog'
import { useFormat } from '../composables/use-format'
import TripSheet from '../plan/TripSheet.vue'
import { useServices } from '../services'
import { countdownTo } from './countdown'
import DirectionTag from './DirectionTag.vue'

const props = defineProps<{ ride: Ride; route: Route; now: Instant }>()

const emit = defineEmits<{ dismiss: []; arrived: []; observe: [journey: Journey] }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()
const sheet = useDialog()

const ends = computed(() => endpoints(props.route, props.ride.direction))

// Asks like the board of that direction, so both share their journeys and the delays stay
// current until the arrival.
const monitor = useServices().createTripMonitor()
const snapshot = shallowRef<MonitorSnapshot>(monitor.snapshot)
const unsubscribe = monitor.subscribe((next) => {
  snapshot.value = next
})
watch(
  [() => props.ride, ends],
  ([ride, current]) => {
    monitor.watch({
      pairs: stopPairs(current),
      lookBack: true,
      nextLeaveAt: (journeys) =>
        planTrip(currentJourney(ride, journeys), current)?.arrivalAt ?? null,
    })
  },
  { immediate: true },
)
onScopeDispose(() => {
  unsubscribe()
  monitor.dispose()
})

const trip = computed(() =>
  planTrip(currentJourney(props.ride, snapshot.value.journeys), ends.value),
)
watch(trip, (current) => {
  if (current) emit('observe', current.journey)
})
const countdown = computed(() => (trip.value ? countdownTo(trip.value.arrivalAt, props.now) : null))

watch(
  () => !trip.value || props.now >= trip.value.arrivalAt,
  (over) => {
    if (over) emit('arrived')
  },
  { immediate: true },
)
</script>

<template>
  <GlassCard v-if="trip && countdown" tag="section" :aria-labelledby="headingId" class="ride-card">
    <div class="flex flex-wrap items-center gap-2.5">
      <h2 :id="headingId" class="flex items-center gap-1.5 font-semibold">
        <IconTrain aria-hidden="true" />
        {{ t('now.ride.label') }}
      </h2>
      <DirectionTag :ends />
    </div>

    <p class="count">
      <span class="text-sm font-semibold text-ink-subtle">
        {{ countdown.kind === 'at' ? t('now.ride.arrivalAt') : t('now.ride.arrivalIn') }}
      </span>
      <span v-if="countdown.kind === 'minutes'" class="value">
        {{ countdown.minutes }}<span class="unit">{{ t('now.minutesUnit') }}</span>
      </span>
      <span v-else-if="countdown.kind === 'now'" class="value">{{ t('now.now') }}</span>
      <span v-else class="value">{{ format.time(countdown.at) }}</span>
    </p>
    <p class="flex flex-wrap items-center gap-1.5">
      <LineBadge
        v-for="leg in ridesOf(trip.journey)"
        :key="`${leg.line.name}@${leg.departure.scheduledAt}`"
        :name="leg.line.name"
        :mode="leg.line.mode"
      />
      <span class="ml-1 text-sm text-ink-muted">
        {{
          t('now.upcoming.times', {
            departure: format.time(trip.departureAt),
            arrival: format.time(trip.arrivalAt),
          })
        }}
      </span>
    </p>

    <div class="flex flex-wrap gap-2">
      <BaseButton @click="sheet.show">
        <IconListDetails aria-hidden="true" />
        {{ t('plan.details') }}
      </BaseButton>
      <BaseButton variant="quiet" @click="emit('dismiss')">{{ t('now.ride.dismiss') }}</BaseButton>
    </div>

    <TripSheet
      v-if="sheet.used.value"
      v-model:open="sheet.open.value"
      :trip
      :ends
      :pinned="false"
      :can-pin="false"
    />
  </GlassCard>
</template>

<style scoped>
.ride-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
}

.ride-card > :first-child {
  flex-basis: 100%;
}

.count {
  display: flex;
  flex-direction: column;
}

.value {
  font-size: 2.5rem;
  font-variant-numeric: tabular-nums;
  font-weight: 250;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

.unit {
  margin-left: 0.15em;
  color: var(--color-ink-muted);
  font-size: 0.4em;
  font-weight: 600;
  letter-spacing: 0;
}
</style>
