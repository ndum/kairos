<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCalendarEvent from '~icons/tabler/calendar-event'

import type { Route } from '@/domain/route'
import { serviceDayOf } from '@/domain/service-day'
import { HOUR, type Instant } from '@/domain/time'

import GlassCard from '../components/GlassCard.vue'
import { useFormat } from '../composables/use-format'
import { useArrivalPreview } from './use-arrival-preview'

// In the evening, when to leave on the next day of the schedule, so the user knows how early
// the morning starts without opening the planner.

const props = defineProps<{ route: Route; now: Instant }>()

const { t } = useI18n()
const format = useFormat()
const { by, trip } = useArrivalPreview(toRef(props, 'route'), toRef(props, 'now'))

const day = computed(() => {
  if (by.value === null) return ''
  const tomorrow = serviceDayOf(props.now + 24 * HOUR)
  return serviceDayOf(by.value) === tomorrow ? t('now.preview.tomorrow') : format.weekday(by.value)
})
</script>

<template>
  <GlassCard v-if="by !== null && trip" tag="section" class="preview flex items-start gap-3">
    <IconCalendarEvent aria-hidden="true" class="mt-0.5 flex-none text-ink-subtle" />
    <div class="flex min-w-0 flex-col gap-0.5">
      <p class="font-semibold">
        {{
          t('now.preview.text', {
            day,
            leave: format.time(trip.leaveAt),
            arrival: format.time(trip.arrivalAt),
          })
        }}
      </p>
      <p class="text-sm text-ink-muted">{{ t('now.preview.by', { time: format.time(by) }) }}</p>
    </div>
  </GlassCard>
</template>

<style scoped>
.preview {
  padding: 1rem 1.25rem;
}
</style>
