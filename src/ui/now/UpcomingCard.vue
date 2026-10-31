<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconChevronDown from '~icons/tabler/chevron-down'
import IconChevronRight from '~icons/tabler/chevron-right'

import { ridesOf } from '@/domain/journey'
import type { Trip } from '@/domain/trip'

import GlassCard from '../components/GlassCard.vue'
import LineBadge from '../components/LineBadge.vue'
import { useFormat } from '../composables/use-format'

defineProps<{
  trips: readonly Trip[]
  /** The trips leave before the main one, which arrives just in time. */
  earlier?: boolean
  /** Trips that can no longer be caught, latest first, folded away below the others. */
  missed?: readonly Trip[]
}>()

const emit = defineEmits<{ details: [trip: Trip] }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()
</script>

<template>
  <GlassCard tag="section" :aria-labelledby="headingId" class="upcoming flex flex-col">
    <h2 :id="headingId" class="mb-1.5 px-2.5 text-lg font-semibold min-[900px]:text-xl">
      {{ earlier ? t('now.upcoming.earlier') : t('now.upcoming.title') }}
    </h2>
    <ol v-if="trips.length > 0">
      <li v-for="trip in trips" :key="trip.leaveAt">
        <button type="button" class="option" @click="emit('details', trip)">
          <span class="leave">
            <span class="sr-only">{{ t('now.leaveAt') }}</span>
            <span class="time">{{ format.time(trip.leaveAt) }}</span>
            <span class="text-xs text-ink-subtle" aria-hidden="true">
              {{ t('now.upcoming.leave') }}
            </span>
          </span>
          <span class="flex min-w-0 flex-1 flex-wrap gap-1.5">
            <LineBadge
              v-for="ride in ridesOf(trip.journey)"
              :key="`${ride.line.name}@${ride.departure.scheduledAt}`"
              :name="ride.line.name"
              :mode="ride.line.mode"
            />
          </span>
          <span class="text-sm whitespace-nowrap text-ink-muted">
            {{ t('now.upcoming.arrival', { time: format.time(trip.arrivalAt) }) }}
          </span>
          <IconChevronRight aria-hidden="true" class="flex-none text-ink-subtle" />
          <span class="sr-only">{{ t('now.upcoming.details') }}</span>
        </button>
      </li>
    </ol>
    <p v-else class="px-2.5 pb-3 text-ink-muted">{{ t('now.upcoming.empty') }}</p>

    <!-- The user may be on one of these, so they stay a tap away without taking the room. -->
    <details v-if="missed?.length" class="missed">
      <summary class="summary">
        {{ t('now.missed.summary', missed.length) }}
        <IconChevronDown aria-hidden="true" class="chevron flex-none" />
      </summary>
      <ol>
        <li v-for="trip in missed" :key="trip.departureAt">
          <button type="button" class="option" @click="emit('details', trip)">
            <span class="leave">
              <span class="sr-only">{{ t('now.missed.departureAt') }}</span>
              <span class="time">{{ format.time(trip.departureAt) }}</span>
              <span class="text-xs text-ink-subtle" aria-hidden="true">
                {{ t('now.missed.departure') }}
              </span>
            </span>
            <span class="flex min-w-0 flex-1 flex-wrap gap-1.5">
              <LineBadge
                v-for="ride in ridesOf(trip.journey)"
                :key="`${ride.line.name}@${ride.departure.scheduledAt}`"
                :name="ride.line.name"
                :mode="ride.line.mode"
              />
            </span>
            <span class="text-sm whitespace-nowrap text-ink-muted">
              {{ t('now.upcoming.arrival', { time: format.time(trip.arrivalAt) }) }}
            </span>
            <IconChevronRight aria-hidden="true" class="flex-none text-ink-subtle" />
            <span class="sr-only">{{ t('now.upcoming.details') }}</span>
          </button>
        </li>
      </ol>
    </details>
  </GlassCard>
</template>

<style scoped>
.upcoming {
  padding: 1rem 0.625rem 0.5rem;
}

/* A fine line between the trips, which leaves the rows their full width to react on. */
li + li::before,
.missed::before {
  display: block;
  height: 1px;
  margin-inline: 0.5rem;
  background: var(--color-hairline);
  content: '';
}

/* The whole row opens the details, so it reacts like a button across its full width. */
.option {
  display: flex;
  width: 100%;
  min-height: 3.5rem;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.875rem;
  padding: 0.5rem 0.625rem;
  text-align: left;
  transition: background-color 0.2s;
}

.option:hover,
.summary:hover {
  background: var(--color-press);
}

.summary {
  display: flex;
  min-height: 2.75rem;
  cursor: pointer;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.25rem;
  border-radius: 0.875rem;
  padding: 0.5rem 0.625rem;
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  font-weight: 550;
  list-style: none;
  transition: background-color 0.2s;
}

.summary::-webkit-details-marker {
  display: none;
}

.chevron {
  transition: transform 0.2s;
}

.missed[open] .chevron {
  transform: rotate(180deg);
}

/* Trips that are gone step back behind the ones still to come. */
.missed .time {
  color: var(--color-ink-muted);
}

.leave {
  display: flex;
  width: 3.875rem;
  flex: none;
  flex-direction: column;
}

.time {
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.15;
}

@media (min-width: 900px) {
  .upcoming {
    padding: 1.25rem 0.875rem 0.625rem;
  }

  .option {
    min-height: 3.75rem;
    gap: 0.875rem;
  }

  .leave {
    width: 4.125rem;
  }

  .time {
    font-size: 1.5rem;
  }
}
</style>
