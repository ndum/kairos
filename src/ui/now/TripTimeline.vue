<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconFlag from '~icons/tabler/flag'
import IconHome from '~icons/tabler/home'
import IconTransfer from '~icons/tabler/transfer'

import { type RideLeg, type Stopover, delayOf, expectedTime, ridesOf } from '@/domain/journey'
import type { Endpoints } from '@/domain/route'
import { MINUTE } from '@/domain/time'
import type { Transfer } from '@/domain/transfer'
import type { Trip } from '@/domain/trip'

import LineBadge from '../components/LineBadge.vue'
import { modeIcon } from '../components/mode-icon'
import { useFormat } from '../composables/use-format'
import { stepsOf } from './itinerary'
import PlatformText from './PlatformText.vue'

// The trip step by step: leaving the place, each ride with the transfer after it, and the
// arrival at the destination, with times, platforms, delays and the stops in between.

const props = defineProps<{ trip: Trip; ends: Endpoints }>()

const { t } = useI18n()
const format = useFormat()

const steps = computed(() => stepsOf(props.trip, props.ends))
const rides = computed(() => ridesOf(props.trip.journey))

const walkToStop = computed(() => format.minutes(props.trip.departureAt - props.trip.latestLeaveAt))
const buffer = computed(() => format.minutes(props.trip.latestLeaveAt - props.trip.leaveAt))
const walkFromStop = computed(() => {
  const last = rides.value.at(-1)
  return last ? format.minutes(props.trip.arrivalAt - expectedTime(last.arrival)) : 0
})

/** The train number and the operator, for example "Zug 2254, SBB". */
function serviceText({ line, tripNumber, operator }: RideLeg): string {
  const number =
    line.mode === 'train' && tripNumber ? t('now.journey.trainNumber', { number: tripNumber }) : ''
  return [number, operator].filter(Boolean).join(', ')
}

const stopoverDelay = (stopover: Stopover): number =>
  stopover.expectedAt === undefined ? 0 : stopover.expectedAt - stopover.scheduledAt

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
    buffer: buffer.value,
  }
  return buffer.value > 0
    ? t('now.journey.walkToWithBuffer', values)
    : t('now.journey.walkTo', values)
})
</script>

<template>
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
          <p v-if="serviceText(step.leg)" class="detail">{{ serviceText(step.leg) }}</p>
          <p class="detail">
            {{ t('now.journey.from', { stop: step.leg.departure.stop.name }) }}
            <span
              v-if="step.leg.departure.platform || step.leg.departure.expectedPlatform"
              class="platform"
            >
              <PlatformText :event="step.leg.departure" :mode="step.leg.line.mode" />
            </span>
          </p>
          <details v-if="step.leg.stopovers.length > 0" class="stopovers">
            <summary>{{ t('now.journey.stopovers', step.leg.stopovers.length) }}</summary>
            <ol>
              <li
                v-for="stopover in step.leg.stopovers"
                :key="`${stopover.stop.id}@${stopover.scheduledAt}`"
              >
                <span class="stopover-time" :class="{ late: stopoverDelay(stopover) >= MINUTE }">
                  {{ format.time(stopover.expectedAt ?? stopover.scheduledAt) }}
                </span>
                <span class="truncate">{{ stopover.stop.name }}</span>
                <span v-if="stopover.platform" class="stopover-platform">
                  {{
                    t(`now.platform.${step.leg.line.mode === 'train' ? 'track' : 'bay'}`, {
                      platform: stopover.platform,
                    })
                  }}
                </span>
              </li>
            </ol>
          </details>
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
</template>

<style scoped>
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

.stopovers {
  color: var(--color-ink-muted);
  font-size: 0.9rem;
}

.stopovers summary {
  width: fit-content;
  cursor: pointer;
  border-radius: 0.5rem;
  padding-block: 0.15rem;
  font-weight: 600;
}

.stopovers summary:focus-visible {
  outline: 2px solid var(--color-train);
  outline-offset: 2px;
}

.stopovers ol {
  display: grid;
  gap: 0.2rem;
  margin: 0.35rem 0 0.25rem;
  border-left: 2px dotted var(--color-buffer);
  padding-left: 0.75rem;
}

.stopovers li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.6rem;
}

.stopover-time {
  font-variant-numeric: tabular-nums;
}

.stopover-time.late {
  color: var(--color-late);
  font-weight: 600;
}

.stopover-platform {
  color: var(--color-ink-subtle);
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
