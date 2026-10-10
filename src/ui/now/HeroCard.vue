<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconBolt from '~icons/tabler/bolt'
import IconLoader from '~icons/tabler/loader-2'

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

const props = defineProps<{
  board: Board
  ends: Endpoints
  now: Instant
  status: MonitorStatus
}>()

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()
const directionId = useId()

const main = computed(() => props.board.main)
const firstRide = computed(() => (main.value ? ridesOf(main.value.journey)[0] : undefined))
const urgency = computed(() => (main.value ? urgencyOf(main.value, props.now) : null))
const countdown = computed(() => (main.value ? countdownTo(main.value.leaveAt, props.now) : null))
const progress = computed(() => (main.value ? urgencyProgress(main.value.leaveAt, props.now) : 0))

const label = computed(() => {
  if (countdown.value?.kind === 'at') return t('now.leaveAt')
  if (countdown.value?.kind === 'now') return t('now.leave')
  return t('now.leaveIn')
})

/** Minutes left to catch the tight trip, which no longer leaves room for the reserve. */
const tightMinutes = computed(() => {
  const tight = props.board.tight
  return tight ? Math.max(0, format.minutes(tight.latestLeaveAt - props.now)) : 0
})

const alternative = computed(() => {
  const trip = props.board.alternative
  return trip ? { trip, rides: ridesOf(trip.journey) } : null
})
</script>

<template>
  <GlassCard
    tag="section"
    :lift="false"
    class="hero flex flex-col gap-[clamp(0.75rem,1vw,1.5rem)]"
    :data-urgency="urgency ?? undefined"
    :aria-labelledby="`${directionId} ${headingId}`"
  >
    <i class="halo" aria-hidden="true" />
    <div class="flex flex-wrap items-center gap-2.5">
      <DirectionTag :id="directionId" :ends />
      <h2 :id="headingId" class="label font-semibold text-ink-subtle">{{ label }}</h2>
    </div>

    <template v-if="main && countdown && firstRide">
      <p class="count" aria-live="off">
        <template v-if="countdown.kind === 'minutes'">
          {{ countdown.minutes }}<span class="unit">{{ t('now.minutesUnit') }}</span>
        </template>
        <template v-else-if="countdown.kind === 'now'">{{ t('now.now') }}</template>
        <template v-else>{{ format.time(countdown.at) }}</template>
      </p>
      <div class="meter" aria-hidden="true">
        <i :style="{ transform: `scaleX(${progress.toFixed(3)})` }" />
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 font-semibold">
        <span class="chip" :class="urgency">{{ t(`now.urgency.${urgency}`) }}</span>
        <span class="flex items-center gap-2">
          <LineBadge :name="firstRide.line.name" :mode="firstRide.line.mode" />
          {{ t('now.from', { stop: firstRide.departure.stop.name }) }}
        </span>
      </div>

      <dl class="kv">
        <div>
          <dt>{{ t('now.departure') }}</dt>
          <dd>
            {{ format.time(main.departureAt) }}
            <span v-if="main.delay > 0" class="delay">
              {{ t('now.delay', { minutes: format.minutes(main.delay) }) }}
            </span>
          </dd>
          <dd class="detail">
            <PlatformText :event="firstRide.departure" :mode="firstRide.line.mode" />
          </dd>
        </div>
        <div>
          <dt>{{ t('now.arrival') }}</dt>
          <dd>{{ format.time(main.arrivalAt) }}</dd>
          <dd class="detail">{{ ends.destination.name }}</dd>
        </div>
      </dl>

      <p v-if="alternative" class="hint">
        <IconBolt aria-hidden="true" class="flex-none text-train" />
        <span>
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

    <div v-else class="flex flex-col items-start gap-3 py-4">
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

    <p v-if="board.tight" class="tight" role="status">
      {{
        tightMinutes > 0
          ? t('now.tight.minutes', {
              time: format.time(board.tight.departureAt),
              minutes: tightMinutes,
            })
          : t('now.tight.now', { time: format.time(board.tight.departureAt) })
      }}
    </p>
  </GlassCard>
</template>

<style scoped>
.hero {
  --state-color: transparent;
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

.label {
  font-size: clamp(0.875rem, min(0.9vw, 1.7vh), 1.3rem);
}

.count {
  display: flex;
  align-items: baseline;
  gap: 0.1em;
  font-size: clamp(5.5rem, min(9vw, 17vh), 20rem);
  font-weight: 220;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.06em;
  line-height: 0.92;
}

.count .unit {
  color: var(--color-ink-muted);
  font-size: 0.17em;
  font-weight: 600;
  letter-spacing: 0;
}

.meter {
  height: 0.5rem;
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
  height: 2em;
  align-items: center;
  gap: 0.5em;
  border-radius: 9999px;
  padding-inline: 0.85em;
  background: var(--chip-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--chip) 24%, transparent);
  color: var(--color-ink);
  font-size: 0.875rem;
  white-space: nowrap;
}

.chip::before {
  width: 0.55em;
  height: 0.55em;
  border-radius: 50%;
  background: var(--chip);
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
  padding-top: clamp(0.75rem, 0.9vw, 1.25rem);
}

.kv dt {
  color: var(--color-ink-subtle);
  font-size: 0.85rem;
  font-weight: 600;
}

.kv dd {
  font-size: 1.125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}

.kv dd.detail {
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  font-weight: 500;
}

.delay {
  color: var(--color-late);
}

.hint,
.tight {
  display: flex;
  align-items: center;
  gap: 0.6em;
  border-radius: var(--radius-inner);
  padding: 0.7em 1em;
  font-weight: 600;
}

.hint {
  background: var(--color-glass-soft);
  box-shadow: inset 0 0 0 1px var(--color-hairline);
}

.hint > span {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4em;
}

.tight {
  background: var(--color-late-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-late) 25%, transparent);
  color: var(--color-ink);
}

.tight::before {
  flex: none;
  width: 0.55em;
  height: 0.55em;
  border-radius: 50%;
  background: var(--color-late);
  animation: pulse 1s ease-in-out infinite;
  content: '';
}

@keyframes spin {
  to {
    --spin: 1turn;
  }
}

@keyframes pulse {
  50% {
    opacity: 0.3;
  }
}
</style>
