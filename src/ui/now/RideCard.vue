<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import IconListDetails from '~icons/tabler/list-details'
import IconTrain from '~icons/tabler/train'

import { findNextConnection } from '@/application/next-connection'
import { currentJourney } from '@/application/pinned-trip'
import type { Ride } from '@/application/ride'
import type { MonitorSnapshot } from '@/application/trip-monitor'
import { type Journey, expectedTime, ridesOf } from '@/domain/journey'
import { type Route, endpoints, stopPairs } from '@/domain/route'
import { type Instant, MINUTE } from '@/domain/time'
import { nextTransfer } from '@/domain/transfer'
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
import PlatformText from './PlatformText.vue'

const props = defineProps<{ ride: Ride; route: Route; now: Instant }>()

const emit = defineEmits<{ dismiss: []; arrived: []; observe: [journey: Journey] }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()
const sheet = useDialog()

const ends = computed(() => endpoints(props.route, props.ride.direction))

// Asks like the board of that direction, so both share their journeys and the delays stay
// current until the arrival.
const services = useServices()
const monitor = services.createTripMonitor()
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

// The next change of vehicle, and once delays break it, the next connection from that stop.
const next = computed(() => (trip.value ? nextTransfer(trip.value.journey, props.now) : null))
const slackMinutes = computed(() =>
  next.value ? Math.max(0, Math.floor(next.value.transfer.slack / MINUTE)) : 0,
)
const replacement = shallowRef<Journey | null>(null)
const brokenKey = computed(() => {
  const transfer = next.value?.transfer
  if (transfer?.risk !== 'broken') return null
  return `${transfer.departure.stop.id}@${expectedTime(transfer.arrival)}`
})
let search: AbortController | null = null
watch(
  brokenKey,
  async (key) => {
    search?.abort()
    replacement.value = null
    const transfer = next.value?.transfer
    const destination = trip.value ? ridesOf(trip.value.journey).at(-1)?.arrival.stop : undefined
    if (key === null || !transfer || !destination) return
    const request = new AbortController()
    search = request
    try {
      const found = await findNextConnection(
        services.timetable,
        transfer,
        destination,
        request.signal,
      )
      if (!request.signal.aborted) replacement.value = found
    } catch {
      // Without a suggestion, the card still says that the connection is gone.
    }
  },
  { immediate: true },
)
onScopeDispose(() => search?.abort())
const replacementRide = computed(() =>
  replacement.value ? (ridesOf(replacement.value)[0] ?? null) : null,
)
const replacementArrival = computed(() =>
  replacement.value ? ridesOf(replacement.value).at(-1)?.arrival : undefined,
)

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

    <div v-if="next" class="transfer" :class="next.transfer.risk">
      <p class="font-semibold">
        {{ t('now.journey.transfer', { stop: next.transfer.departure.stop.name }) }}
      </p>
      <template v-if="next.transfer.risk !== 'broken'">
        <p class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <LineBadge :name="next.ride.line.name" :mode="next.ride.line.mode" />
          <span>
            {{
              t('now.ride.departs', { time: format.time(expectedTime(next.transfer.departure)) })
            }}
          </span>
          <PlatformText :event="next.transfer.departure" :mode="next.ride.line.mode" />
        </p>
        <p>{{ t('now.journey.transferTime', slackMinutes) }}</p>
      </template>
      <template v-else>
        <p>{{ t('now.ride.broken') }}</p>
        <p
          v-if="replacementRide && replacementArrival"
          class="flex flex-wrap items-center gap-x-1.5 gap-y-1"
        >
          <LineBadge :name="replacementRide.line.name" :mode="replacementRide.line.mode" />
          <span>
            {{
              t('now.ride.nextConnection', {
                time: format.time(expectedTime(replacementRide.departure)),
                arrival: format.time(expectedTime(replacementArrival)),
              })
            }}
          </span>
        </p>
      </template>
    </div>

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

.transfer {
  display: flex;
  flex-basis: 100%;
  flex-direction: column;
  gap: 0.25rem;
  border-radius: 1rem;
  padding: 0.75rem 0.875rem;
  background: var(--color-accent-soft);
  font-size: 0.875rem;
  line-height: 1.45;
}

/* Delays eat into the time to change, or the connection is gone. */
.transfer.tight {
  background: var(--color-soon-soft);
  color: var(--color-soon);
}

.transfer.broken {
  background: var(--color-late-soft);
  color: var(--color-late);
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
