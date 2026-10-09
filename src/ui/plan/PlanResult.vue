<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconListDetails from '~icons/tabler/list-details'
import IconPinned from '~icons/tabler/pinned'

import { ridesOf } from '@/domain/journey'
import { transferRiskOf } from '@/domain/transfer'
import type { Trip } from '@/domain/trip'

import BaseButton from '../components/BaseButton.vue'
import GlassCard from '../components/GlassCard.vue'
import LineBadge from '../components/LineBadge.vue'
import { useFormat } from '../composables/use-format'
import TransferRiskTag from '../now/TransferRiskTag.vue'

const props = defineProps<{ trip: Trip; recommended: boolean; pinned: boolean }>()

const emit = defineEmits<{ details: []; pin: [] }>()

const { t } = useI18n()
const format = useFormat()
const headingId = useId()

const rides = computed(() => ridesOf(props.trip.journey))
const risk = computed(() => transferRiskOf(props.trip.journey))
</script>

<template>
  <GlassCard tag="article" :lift="false" :aria-labelledby="headingId" class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h3 :id="headingId" class="flex flex-col">
        <span class="text-sm font-semibold text-ink-subtle">{{ t('now.leaveAt') }}</span>
        <span class="leave">{{ format.time(trip.leaveAt) }}</span>
        <span class="sr-only">
          {{ t('plan.with', { lines: rides.map((ride) => ride.line.name).join(', ') }) }}
        </span>
      </h3>
      <div class="flex flex-wrap gap-2">
        <span v-if="recommended" class="tag">{{ t('plan.recommended') }}</span>
        <span v-if="pinned" class="tag pinned">
          <IconPinned aria-hidden="true" />
          {{ t('plan.pinned') }}
        </span>
        <TransferRiskTag v-if="risk !== 'ok'" :risk />
      </div>
    </div>

    <p class="flex flex-wrap items-center gap-1.5">
      <LineBadge
        v-for="ride in rides"
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

    <div class="flex flex-wrap gap-2">
      <BaseButton :aria-describedby="headingId" @click="emit('details')">
        <IconListDetails aria-hidden="true" />
        {{ t('plan.details') }}
      </BaseButton>
      <BaseButton v-if="!pinned" variant="quiet" :aria-describedby="headingId" @click="emit('pin')">
        <IconPinned aria-hidden="true" />
        {{ t('plan.pin') }}
      </BaseButton>
    </div>
  </GlassCard>
</template>

<style scoped>
.leave {
  font-size: 2.25rem;
  font-variant-numeric: tabular-nums;
  font-weight: 250;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.tag {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  gap: 0.35em;
  border-radius: 9999px;
  padding-inline: 0.85em;
  background: var(--color-go-soft);
  color: var(--color-ink);
  font-size: 0.875rem;
  font-weight: 650;
}

.tag.pinned {
  background: var(--color-glass);
  box-shadow: inset 0 0 0 1px var(--color-hairline);
}
</style>
