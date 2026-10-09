<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'

import { ridesOf } from '@/domain/journey'
import type { Trip } from '@/domain/trip'

import GlassCard from '../components/GlassCard.vue'
import LineBadge from '../components/LineBadge.vue'
import { useFormat } from '../composables/use-format'

defineProps<{ trips: readonly Trip[] }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()
</script>

<template>
  <GlassCard tag="section" :lift="false" :aria-labelledby="headingId" class="flex flex-col gap-2">
    <h2 :id="headingId" class="text-xl font-semibold tracking-tight">
      {{ t('now.upcoming.title') }}
    </h2>
    <ol v-if="trips.length > 0">
      <li v-for="trip in trips" :key="trip.leaveAt" class="option">
        <span class="leave">
          <span class="sr-only">{{ t('now.leaveAt') }}</span>
          {{ format.time(trip.leaveAt) }}
        </span>
        <div class="grid min-w-0 gap-1">
          <p class="flex flex-wrap gap-1.5">
            <LineBadge
              v-for="ride in ridesOf(trip.journey)"
              :key="`${ride.line.name}@${ride.departure.scheduledAt}`"
              :name="ride.line.name"
              :mode="ride.line.mode"
            />
          </p>
          <p class="text-sm text-ink-muted">
            {{
              t('now.upcoming.times', {
                departure: format.time(trip.departureAt),
                arrival: format.time(trip.arrivalAt),
              })
            }}
          </p>
        </div>
      </li>
    </ol>
    <p v-else class="text-ink-muted">{{ t('now.upcoming.empty') }}</p>
  </GlassCard>
</template>

<style scoped>
.option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem 1rem;
  padding-block: 0.85rem;
}

.option + .option {
  border-top: 1px solid var(--color-hairline);
}

.leave {
  font-size: 1.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 250;
  letter-spacing: -0.04em;
}
</style>
