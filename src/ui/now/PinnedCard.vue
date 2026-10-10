<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import IconListDetails from '~icons/tabler/list-details'
import IconPinned from '~icons/tabler/pinned'

import { currentJourney, type PinnedTrip } from '@/application/pinned-trip'
import type { MonitorSnapshot } from '@/application/trip-monitor'
import { ridesOf } from '@/domain/journey'
import { type Route, endpoints } from '@/domain/route'
import { type Instant, MINUTE } from '@/domain/time'
import { planTrip } from '@/domain/trip'
import { urgencyOf } from '@/domain/urgency'

import BaseButton from '../components/BaseButton.vue'
import GlassCard from '../components/GlassCard.vue'
import LineBadge from '../components/LineBadge.vue'
import { useDialog } from '../composables/use-dialog'
import { useFormat } from '../composables/use-format'
import TripSheet from '../plan/TripSheet.vue'
import { useServices } from '../services'
import { countdownTo } from './countdown'
import DirectionTag from './DirectionTag.vue'

const props = defineProps<{ pinned: PinnedTrip; route: Route; now: Instant }>()

const emit = defineEmits<{ unpin: [] }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()
const sheet = useDialog()

const ends = computed(() => endpoints(props.route, props.pinned.direction))

// A monitor of its own asks for journeys around the pinned trip, so its delays are current
// even while it is still hours away.
const monitor = useServices().createTripMonitor()
const snapshot = shallowRef<MonitorSnapshot>(monitor.snapshot)
const unsubscribe = monitor.subscribe((next) => {
  snapshot.value = next
})
watch(
  [() => props.pinned, ends],
  ([pinned, current]) => {
    monitor.watch({
      from: current.origin.stop,
      to: current.destination.stop,
      at: pinned.departureAt - 5 * MINUTE,
      nextLeaveAt: (journeys) =>
        planTrip(currentJourney(pinned, journeys), current)?.leaveAt ?? null,
    })
  },
  { immediate: true },
)
onScopeDispose(() => {
  unsubscribe()
  monitor.dispose()
})

const trip = computed(() =>
  planTrip(currentJourney(props.pinned, snapshot.value.journeys), ends.value),
)
const missed = computed(() => (trip.value ? urgencyOf(trip.value, props.now) === 'missed' : true))
const countdown = computed(() => (trip.value ? countdownTo(trip.value.leaveAt, props.now) : null))
</script>

<template>
  <GlassCard tag="section" :lift="false" :aria-labelledby="headingId" class="pinned-card">
    <div class="flex flex-wrap items-center gap-2.5">
      <h2 :id="headingId" class="flex items-center gap-1.5 font-semibold">
        <IconPinned aria-hidden="true" />
        {{ t('now.pinned.label') }}
      </h2>
      <DirectionTag :ends />
    </div>

    <template v-if="trip && countdown && !missed">
      <p class="count">
        <span class="text-sm font-semibold text-ink-subtle">
          {{ countdown.kind === 'at' ? t('now.leaveAt') : t('now.leaveIn') }}
        </span>
        <span v-if="countdown.kind === 'minutes'" class="value">
          {{ countdown.minutes }}<span class="unit">{{ t('now.minutesUnit') }}</span>
        </span>
        <span v-else-if="countdown.kind === 'now'" class="value">{{ t('now.now') }}</span>
        <span v-else class="value">{{ format.time(countdown.at) }}</span>
      </p>
      <p class="flex flex-wrap items-center gap-1.5">
        <LineBadge
          v-for="ride in ridesOf(trip.journey)"
          :key="`${ride.line.name}@${ride.departure.scheduledAt}`"
          :name="ride.line.name"
          :mode="ride.line.mode"
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
    </template>
    <p v-else class="text-ink-muted">{{ t('now.pinned.missed') }}</p>

    <div class="flex flex-wrap gap-2">
      <BaseButton v-if="trip && !missed" @click="sheet.show">
        <IconListDetails aria-hidden="true" />
        {{ t('plan.details') }}
      </BaseButton>
      <BaseButton variant="quiet" @click="emit('unpin')">{{ t('plan.unpin') }}</BaseButton>
    </div>

    <TripSheet
      v-if="sheet.used.value && trip"
      v-model:open="sheet.open.value"
      :trip
      :ends
      :pinned="true"
      @unpin="emit('unpin')"
    />
  </GlassCard>
</template>

<style scoped>
.pinned-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
}

.pinned-card > :first-child {
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
