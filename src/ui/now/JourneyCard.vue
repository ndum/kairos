<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '~icons/tabler/alert-triangle'
import IconFlag from '~icons/tabler/flag'
import IconHome from '~icons/tabler/home'
import IconTransfer from '~icons/tabler/transfer'

import { delayOf, expectedTime, ridesOf } from '@/domain/journey'
import type { Endpoints } from '@/domain/route'
import { MINUTE } from '@/domain/time'
import { type Transfer, transferRiskOf } from '@/domain/transfer'
import type { Trip } from '@/domain/trip'

import GlassCard from '../components/GlassCard.vue'
import LineBadge from '../components/LineBadge.vue'
import { modeIcon } from '../components/mode-icon'
import { useFormat } from '../composables/use-format'
import ItineraryBar from './ItineraryBar.vue'
import { segmentsOf, stepsOf } from './itinerary'
import PlatformText from './PlatformText.vue'

const props = defineProps<{ trip: Trip; ends: Endpoints }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()

const segments = computed(() => segmentsOf(props.trip, props.ends.origin, props.ends.destination))
const steps = computed(() => stepsOf(props.trip, props.ends.origin, props.ends.destination))
const risk = computed(() => transferRiskOf(props.trip.journey))
const rides = computed(() => ridesOf(props.trip.journey))

const walkToStop = computed(() => format.minutes(props.trip.departureAt - props.trip.latestLeaveAt))
const reserve = computed(() => format.minutes(props.trip.latestLeaveAt - props.trip.leaveAt))
const walkFromStop = computed(() => {
  const last = rides.value.at(-1)
  return last ? format.minutes(props.trip.arrivalAt - expectedTime(last.arrival)) : 0
})

function transferText(transfer: Transfer): string {
  const time = t('now.journey.transferTime', Math.max(0, Math.floor(transfer.slack / MINUTE)))
  return transfer.walk > 0
    ? t('now.journey.transferWithWalk', { walk: format.minutes(transfer.walk), time })
    : time
}

const leaveDetail = computed(() => {
  const values = {
    minutes: walkToStop.value,
    stop: rides.value[0]?.departure.stop.name ?? '',
    reserve: reserve.value,
  }
  return reserve.value > 0
    ? t('now.journey.walkToWithReserve', values)
    : t('now.journey.walkTo', values)
})
</script>

<template>
  <GlassCard tag="section" :lift="false" :aria-labelledby="headingId" class="flex flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 :id="headingId" class="text-xl font-semibold tracking-tight">
        {{ t('now.journey.title') }}
      </h2>
      <span v-if="risk !== 'ok'" class="risk" :class="risk">
        <IconAlertTriangle aria-hidden="true" />
        {{ t(`now.risk.${risk}`) }}
      </span>
    </div>

    <ItineraryBar :segments />

    <ol class="timeline">
      <li v-for="(step, index) in steps" :key="index" class="step" :class="step.kind">
        <template v-if="step.kind === 'leave'">
          <span class="time">{{ format.time(step.at) }}</span>
          <span class="marker"><IconHome aria-hidden="true" /></span>
          <div class="text">
            <p class="title">{{ step.place.name }}</p>
            <p class="detail">{{ leaveDetail }}</p>
          </div>
        </template>

        <template v-else-if="step.kind === 'ride'">
          <span class="time">
            {{ format.time(expectedTime(step.leg.departure)) }}
            <span v-if="delayOf(step.leg.departure) >= MINUTE" class="delay">
              {{ t('now.delayShort', { minutes: format.minutes(delayOf(step.leg.departure)) }) }}
            </span>
          </span>
          <span class="marker" :class="step.leg.line.mode">
            <component :is="modeIcon(step.leg.line.mode)" aria-hidden="true" />
          </span>
          <div class="text">
            <p class="title flex flex-wrap items-center gap-2">
              <LineBadge :name="step.leg.line.name" :mode="step.leg.line.mode" />
              <span v-if="step.leg.line.headsign">
                {{ t('now.journey.towards', { headsign: step.leg.line.headsign }) }}
              </span>
            </p>
            <p class="detail">
              {{ t('now.journey.from', { stop: step.leg.departure.stop.name }) }}
              <span
                v-if="step.leg.departure.platform || step.leg.departure.expectedPlatform"
                class="platform"
              >
                <PlatformText :event="step.leg.departure" :mode="step.leg.line.mode" />
              </span>
            </p>
            <p class="detail">
              {{
                t('now.journey.until', {
                  stop: step.leg.arrival.stop.name,
                  time: format.time(expectedTime(step.leg.arrival)),
                })
              }}
            </p>
          </div>
        </template>

        <template v-else-if="step.kind === 'transfer'">
          <span class="time" />
          <span class="marker small"><IconTransfer aria-hidden="true" /></span>
          <div class="text">
            <p class="title">
              {{ t('now.journey.transfer', { stop: step.transfer.departure.stop.name }) }}
            </p>
            <p class="detail" :class="step.transfer.risk">{{ transferText(step.transfer) }}</p>
          </div>
        </template>

        <template v-else>
          <span class="time">{{ format.time(step.at) }}</span>
          <span class="marker"><IconFlag aria-hidden="true" /></span>
          <div class="text">
            <p class="title">{{ step.place.name }}</p>
            <p v-if="walkFromStop > 0" class="detail">
              {{
                t('now.journey.walkFrom', {
                  minutes: walkFromStop,
                  stop: rides.at(-1)?.arrival.stop.name ?? '',
                })
              }}
            </p>
          </div>
        </template>
      </li>
    </ol>
  </GlassCard>
</template>

<style scoped>
.risk {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  gap: 0.4em;
  border-radius: 9999px;
  padding-inline: 0.85em;
  color: var(--color-ink);
  font-size: 0.875rem;
  font-weight: 650;
}

.risk.tight {
  background: var(--color-soon-soft);
}

.risk.broken {
  background: var(--color-late-soft);
}

.risk svg {
  color: var(--color-late);
}

.timeline {
  display: grid;
}

.step {
  position: relative;
  display: grid;
  grid-template-columns: 3.4em 2.25rem minmax(0, 1fr);
  column-gap: 0.75rem;
  padding-bottom: 1.1rem;
}

.step:last-child {
  padding-bottom: 0;
}

/* The line between the markers, as on a timetable. */
.step:not(:last-child)::before {
  position: absolute;
  top: 2.4rem;
  bottom: 0.2rem;
  left: calc(3.4em + 0.75rem + 1.125rem - 1px);
  width: 2px;
  border-radius: 2px;
  background: var(--color-buffer);
  content: '';
}

.time {
  padding-top: 0.4rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  text-align: right;
}

.delay {
  display: block;
  color: var(--color-late);
  font-size: 0.85em;
}

.marker {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border-radius: 50%;
  background: var(--color-ink);
  color: var(--color-on-ink);
}

.marker.train,
.marker.tram {
  background: var(--color-train);
  color: var(--color-on-vehicle);
}

.marker.bus {
  background: var(--color-bus);
  color: var(--color-on-vehicle);
}

.marker.small {
  background: var(--color-glass);
  box-shadow: inset 0 0 0 1px var(--color-hairline);
  color: var(--color-ink-muted);
}

.text {
  display: grid;
  min-width: 0;
  gap: 0.15rem;
  padding-top: 0.35rem;
}

.title {
  font-weight: 650;
}

.detail {
  color: var(--color-ink-muted);
  font-size: 0.9rem;
}

.platform {
  display: inline-flex;
  margin-left: 0.35em;
  border-radius: 0.5rem;
  padding: 0.05em 0.5em;
  background: var(--color-glass);
  box-shadow: inset 0 0 0 1px var(--color-hairline);
  color: var(--color-ink);
  font-size: 0.85em;
  font-weight: 600;
}

.detail.tight {
  color: var(--color-ink);
  font-weight: 600;
}

.detail.broken {
  color: var(--color-late);
  font-weight: 650;
}
</style>
