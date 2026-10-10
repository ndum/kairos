<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconChevronRight from '~icons/tabler/chevron-right'

import { ridesOf } from '@/domain/journey'
import type { Trip } from '@/domain/trip'

import GlassCard from '../components/GlassCard.vue'
import LineBadge from '../components/LineBadge.vue'
import { useFormat } from '../composables/use-format'

defineProps<{ trips: readonly Trip[] }>()

const emit = defineEmits<{ details: [trip: Trip] }>()

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
      <li v-for="trip in trips" :key="trip.leaveAt">
        <button type="button" class="option" @click="emit('details', trip)">
          <span class="leave">
            <span class="sr-only">{{ t('now.leaveAt') }}</span>
            {{ format.time(trip.leaveAt) }}
          </span>
          <span class="grid min-w-0 gap-1">
            <span class="flex flex-wrap gap-1.5">
              <LineBadge
                v-for="ride in ridesOf(trip.journey)"
                :key="`${ride.line.name}@${ride.departure.scheduledAt}`"
                :name="ride.line.name"
                :mode="ride.line.mode"
              />
            </span>
            <span class="text-sm text-ink-muted">
              {{
                t('now.upcoming.times', {
                  departure: format.time(trip.departureAt),
                  arrival: format.time(trip.arrivalAt),
                })
              }}
            </span>
          </span>
          <IconChevronRight aria-hidden="true" class="chevron" />
          <span class="sr-only">{{ t('now.upcoming.details') }}</span>
        </button>
      </li>
    </ol>
    <p v-else class="text-ink-muted">{{ t('now.upcoming.empty') }}</p>
  </GlassCard>
</template>

<style scoped>
li + li {
  border-top: 1px solid var(--color-hairline);
}

/* The whole row opens the details, so it reacts like a button across its full width. */
.option {
  display: grid;
  width: 100%;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-inline: -0.5rem;
  border-radius: 0.875rem;
  padding: 0.85rem 0.5rem;
  box-sizing: content-box;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.option:hover {
  background: var(--color-glass-soft);
}

.option:focus-visible {
  outline: 2px solid var(--color-train);
  outline-offset: 2px;
}

.leave {
  font-size: 1.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 250;
  letter-spacing: -0.04em;
}

.chevron {
  color: var(--color-ink-subtle);
  font-size: 1.25rem;
}
</style>
