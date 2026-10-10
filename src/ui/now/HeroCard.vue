<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconBolt from '~icons/tabler/bolt'
import IconCalendarTime from '~icons/tabler/calendar-time'
import IconChevronRight from '~icons/tabler/chevron-right'
import IconLoader from '~icons/tabler/loader-2'
import IconUmbrella from '~icons/tabler/umbrella'

import type { Board } from '@/application/board'
import type { MonitorStatus } from '@/application/trip-monitor'
import { ridesOf } from '@/domain/journey'
import type { Endpoints } from '@/domain/route'
import type { Instant } from '@/domain/time'
import { urgencyOf } from '@/domain/urgency'

import BaseButton from '../components/BaseButton.vue'
import GlassCard from '../components/GlassCard.vue'
import LineBadge from '../components/LineBadge.vue'
import { useFormat } from '../composables/use-format'
import { countdownTo, urgencyProgress } from './countdown'
import DirectionTag from './DirectionTag.vue'
import PlatformText from './PlatformText.vue'
import type { TripWeather } from './use-trip-weather'
import WeatherChip from './WeatherChip.vue'

const props = defineProps<{
  board: Board
  ends: Endpoints
  now: Instant
  status: MonitorStatus
  /** The weather when leaving and on the walks, unless the user switched it off. */
  weather?: TripWeather | null
}>()

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()
const directionId = useId()

const main = computed(() => props.board.main)
const rides = computed(() => (main.value ? ridesOf(main.value.journey) : []))
const firstRide = computed(() => rides.value[0])
const urgency = computed(() => (main.value ? urgencyOf(main.value, props.now) : null))
const countdown = computed(() => (main.value ? countdownTo(main.value.leaveAt, props.now) : null))
const progress = computed(() => (main.value ? urgencyProgress(main.value.leaveAt, props.now) : 0))

const label = computed(() => {
  if (countdown.value?.kind === 'at') return t('now.leaveAt')
  if (countdown.value?.kind === 'now') return t('now.leave')
  return t('now.leaveIn')
})

/** Minutes left to catch the tight trip, which no longer leaves room for the buffer. */
const tightMinutes = computed(() => {
  const tight = props.board.tight
  return tight ? Math.max(0, format.minutes(tight.latestLeaveAt - props.now)) : 0
})

/** The time today's schedule sets for this direction, and whether the main trip keeps it. */
const scheduleNote = computed(() => {
  const target = props.board.target
  if (!target) return null
  if (target.kind === 'return')
    return t('now.schedule.returnFrom', { time: format.time(target.from) })
  const time = format.time(target.by)
  return props.board.late ? t('now.schedule.late', { time }) : t('now.schedule.inTime', { time })
})

/** Rain or snow on a walk, for example: Gegen 07:15 regnet es auf dem Fussweg zur Haltestelle. */
const wetNote = computed(() => {
  const wet = props.weather?.wet
  if (!wet) return null
  const kind = wet.step.sky === 'snow' ? 'snow' : 'rain'
  return t(`now.weather.wet.${kind}.${wet.walk}`, {
    time: format.time(wet.step.at),
    stop: wet.stop,
  })
})

const alternative = computed(() => {
  const trip = props.board.alternative
  return trip ? { trip, rides: ridesOf(trip.journey) } : null
})
</script>

<template>
  <GlassCard
    tag="section"
    class="hero flex flex-col gap-4"
    :data-urgency="urgency ?? undefined"
    :aria-labelledby="`${directionId} ${headingId}`"
  >
    <i class="halo" aria-hidden="true" />
    <div class="flex flex-wrap items-center justify-between gap-2">
      <DirectionTag :id="directionId" :ends />
      <span class="flex items-center gap-2">
        <WeatherChip v-if="main && weather?.leaving" :step="weather.leaving" />
        <span v-if="urgency" class="chip" :class="urgency">{{ t(`now.urgency.${urgency}`) }}</span>
      </span>
    </div>

    <div class="flex items-end justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h2 :id="headingId" class="text-sm text-ink-subtle min-[900px]:text-base">{{ label }}</h2>
        <p v-if="countdown" class="count" aria-live="off">
          <template v-if="countdown.kind === 'minutes'">
            {{ countdown.minutes }}<span class="unit">{{ t('now.minutesUnit') }}</span>
          </template>
          <template v-else-if="countdown.kind === 'now'">{{ t('now.now') }}</template>
          <template v-else>{{ format.time(countdown.at) }}</template>
        </p>
      </div>
      <p v-if="main && countdown && countdown.kind !== 'at'" class="at">
        <span class="text-sm text-ink-subtle">{{ t('now.at') }}</span>
        {{ format.time(main.leaveAt) }}
      </p>
    </div>

    <template v-if="main && firstRide">
      <div class="meter" aria-hidden="true">
        <i :style="{ transform: `scaleX(${progress.toFixed(3)})` }" />
      </div>

      <p class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <template
          v-for="(ride, index) in rides"
          :key="`${ride.line.name}@${ride.departure.scheduledAt}`"
        >
          <IconChevronRight v-if="index > 0" aria-hidden="true" class="text-ink-subtle" />
          <LineBadge :name="ride.line.name" :mode="ride.line.mode" />
        </template>
        <span class="text-ink-muted">
          {{ t('now.from', { stop: firstRide.departure.stop.name })
          }}<template v-if="firstRide.departure.platform || firstRide.departure.expectedPlatform"
            >,
            <PlatformText :event="firstRide.departure" :mode="firstRide.line.mode" />
          </template>
        </span>
      </p>

      <p v-if="scheduleNote" class="schedule" :class="{ late: board.late }">
        <IconCalendarTime aria-hidden="true" class="flex-none" />
        {{ scheduleNote }}
      </p>

      <dl class="kv">
        <div>
          <dt>{{ t('now.departure') }}</dt>
          <dd>
            {{ format.time(main.departureAt) }}
            <span v-if="main.delay > 0" class="delay">
              {{ t('now.delay', { minutes: format.minutes(main.delay) }) }}
            </span>
          </dd>
        </div>
        <div>
          <dt>{{ t('now.arrivalAt', { place: ends.destination.name }) }}</dt>
          <dd>{{ format.time(main.arrivalAt) }}</dd>
        </div>
      </dl>

      <p v-if="wetNote" class="note">
        <IconUmbrella aria-hidden="true" class="mt-0.5 flex-none text-train" />
        <span>{{ wetNote }}</span>
      </p>

      <p v-if="alternative" class="note">
        <IconBolt aria-hidden="true" class="mt-0.5 flex-none text-train" />
        <span class="flex flex-wrap items-center gap-1.5">
          {{ t('now.alternative.faster') }}
          <LineBadge
            v-for="ride in alternative.rides"
            :key="`${ride.line.name}@${ride.departure.scheduledAt}`"
            :name="ride.line.name"
            :mode="ride.line.mode"
          />
          {{
            t('now.alternative.details', {
              leave: format.time(alternative.trip.leaveAt),
              arrival: format.time(alternative.trip.arrivalAt),
            })
          }}
        </span>
      </p>
    </template>

    <div v-else class="flex flex-col items-start gap-3 py-2">
      <p v-if="status === 'loading'" class="flex items-center gap-2 text-ink-muted">
        <IconLoader aria-hidden="true" class="animate-spin" />
        {{ t('now.loading') }}
      </p>
      <template v-else-if="status === 'error'">
        <p class="text-ink-muted">{{ t('now.unavailable') }}</p>
        <BaseButton @click="emit('retry')">{{ t('now.retry') }}</BaseButton>
      </template>
      <p v-else class="text-ink-muted">{{ t('now.noTrips') }}</p>
    </div>

    <p v-if="board.tight" class="note tight" role="status">
      <IconBolt aria-hidden="true" class="mt-0.5 flex-none" />
      <span>
        {{
          tightMinutes > 0
            ? t('now.tight.minutes', {
                time: format.time(board.tight.departureAt),
                minutes: tightMinutes,
              })
            : t('now.tight.now', { time: format.time(board.tight.departureAt) })
        }}
      </span>
    </p>
  </GlassCard>
</template>

<style scoped>
.hero {
  --state-color: transparent;
}

.schedule {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--color-ink-muted);
  font-size: 0.875rem;
}

.schedule.late {
  color: var(--color-late);
  font-weight: 600;
}

.hero[data-urgency='soon'] {
  --state-color: var(--color-soon);
}

.hero[data-urgency='tight'] {
  --state-color: var(--color-late);
}

/* A light that runs around the card when it is time to go. */
.halo {
  position: absolute;
  inset: -1px;
  padding: 2px;
  border-radius: inherit;
  background: conic-gradient(
    from var(--spin),
    transparent 0turn,
    var(--state-color) 0.14turn,
    transparent 0.3turn,
    transparent 0.5turn,
    var(--state-color) 0.64turn,
    transparent 0.8turn
  );
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.6s;
  pointer-events: none;
}

/* The light only runs while it shows, as animating it costs work on every frame. */
.hero[data-urgency='soon'] .halo,
.hero[data-urgency='tight'] .halo {
  opacity: 1;
  animation: spin 4.5s linear infinite;
}

.count {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 6rem;
  font-weight: 300;
  letter-spacing: -0.045em;
  line-height: 0.88;
}

.count .unit {
  color: var(--color-ink-muted);
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: 0;
}

.at {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-bottom: 0.25rem;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.meter {
  height: 0.375rem;
  overflow: hidden;
  border-radius: 9999px;
  background: var(--color-buffer);
}

.meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-go);
  transform-origin: left;
  transition:
    transform 1s linear,
    background-color 0.6s;
}

.hero[data-urgency='soon'] .meter i {
  background: var(--color-soon);
}

.chip {
  display: inline-flex;
  height: 1.75rem;
  align-items: center;
  gap: 0.45rem;
  border-radius: 9999px;
  padding-inline: 0.7rem;
  background: var(--chip-soft);
  color: var(--chip);
  font-size: 0.8125rem;
  font-weight: 650;
  white-space: nowrap;
}

.chip::before {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
  content: '';
}

.chip.relaxed {
  --chip: var(--color-go);
  --chip-soft: var(--color-go-soft);
}

.chip.soon {
  --chip: var(--color-soon);
  --chip-soft: var(--color-soon-soft);
}

.chip.soon::before {
  animation: pulse 1.4s ease-in-out infinite;
}

.kv {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  border-top: 1px solid var(--color-hairline);
  padding-top: 0.875rem;
}

.kv dt {
  color: var(--color-ink-subtle);
  font-size: 0.8125rem;
}

.kv dd {
  font-size: 1.25rem;
  font-weight: 600;
}

.delay {
  color: var(--color-late);
  font-size: 0.875rem;
}

.note {
  display: flex;
  gap: 0.625rem;
  border-radius: 1rem;
  padding: 0.75rem 0.875rem;
  background: var(--color-accent-soft);
  font-size: 0.875rem;
  line-height: 1.45;
}

.note.tight {
  background: var(--color-soon-soft);
  color: var(--color-soon);
  font-weight: 550;
}

@media (min-width: 900px) {
  .hero {
    gap: 1.25rem;
  }

  .count {
    gap: 0.625rem;
    font-size: 8.25rem;
    letter-spacing: -0.05em;
  }

  .count .unit {
    font-size: 1.625rem;
  }

  .at {
    font-size: 1.625rem;
  }

  .kv dd {
    font-size: 1.625rem;
  }

  .note {
    font-size: 0.9375rem;
  }
}

@keyframes spin {
  to {
    --spin: 1turn;
  }
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}
</style>
