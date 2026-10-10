<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconArrowsExchange from '~icons/tabler/arrows-exchange'

import type { Board } from '@/application/board'
import type { MonitorStatus } from '@/application/trip-monitor'
import { ridesOf } from '@/domain/journey'
import type { Endpoints } from '@/domain/route'
import type { Instant } from '@/domain/time'

import BaseButton from '../components/BaseButton.vue'
import GlassCard from '../components/GlassCard.vue'
import LineBadge from '../components/LineBadge.vue'
import { useFormat } from '../composables/use-format'
import { countdownTo } from './countdown'
import DirectionTag from './DirectionTag.vue'

const props = defineProps<{
  board: Board
  ends: Endpoints
  now: Instant
  status: MonitorStatus
}>()

const emit = defineEmits<{ swap: [] }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()
const directionId = useId()

const main = computed(() => props.board.main)
const countdown = computed(() => (main.value ? countdownTo(main.value.leaveAt, props.now) : null))
</script>

<template>
  <GlassCard
    tag="section"
    :lift="false"
    :aria-labelledby="`${directionId} ${headingId}`"
    class="flex flex-col gap-3"
  >
    <div class="flex flex-wrap items-center gap-2.5">
      <DirectionTag :id="directionId" :ends />
      <h2 :id="headingId" class="font-semibold text-ink-subtle">
        {{ countdown?.kind === 'at' ? t('now.leaveAt') : t('now.leaveIn') }}
      </h2>
    </div>

    <template v-if="main && countdown">
      <p class="count">
        <template v-if="countdown.kind === 'minutes'">
          {{ countdown.minutes }}<span class="unit">{{ t('now.minutesUnit') }}</span>
        </template>
        <template v-else-if="countdown.kind === 'now'">{{ t('now.now') }}</template>
        <template v-else>{{ format.time(countdown.at) }}</template>
      </p>
      <p class="flex flex-wrap items-center gap-1.5">
        <LineBadge
          v-for="ride in ridesOf(main.journey)"
          :key="`${ride.line.name}@${ride.departure.scheduledAt}`"
          :name="ride.line.name"
          :mode="ride.line.mode"
        />
        <span class="ml-1 text-sm text-ink-muted">
          {{
            t('now.upcoming.times', {
              departure: format.time(main.departureAt),
              arrival: format.time(main.arrivalAt),
            })
          }}
        </span>
      </p>
    </template>
    <p v-else class="text-ink-muted">
      {{ status === 'loading' ? t('now.loading') : t('now.noTrips') }}
    </p>

    <BaseButton class="mt-1 self-start" @click="emit('swap')">
      <IconArrowsExchange aria-hidden="true" />
      {{ t('now.swap') }}
    </BaseButton>
  </GlassCard>
</template>

<style scoped>
.count {
  display: flex;
  align-items: baseline;
  gap: 0.1em;
  font-size: clamp(3rem, min(3.6vw, 7vh), 8rem);
  font-variant-numeric: tabular-nums;
  font-weight: 220;
  letter-spacing: -0.06em;
  line-height: 1;
}

.count .unit {
  color: var(--color-ink-muted);
  font-size: 0.26em;
  font-weight: 600;
  letter-spacing: 0;
}
</style>
