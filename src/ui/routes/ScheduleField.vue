<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconChevronDown from '~icons/tabler/chevron-down'
import IconCopy from '~icons/tabler/copy'

import type { Weekday } from '@/domain/schedule'

import BaseButton from '../components/BaseButton.vue'
import { formattingLocale } from '../i18n/locale'
import type { ScheduleDayForm } from './route-form'

// The fixed times of a route per weekday: by when the user has to be there and from when the
// way back starts. Empty fields leave a day to the usual board. On its own page the parent
// names the section, in the assistant the field opens and closes under its own name.

const schedule = defineModel<ScheduleDayForm[]>({ required: true })

const props = defineProps<{
  /** Weekdays whose way back starts before the arrival. */
  errors?: readonly Weekday[]
  /** Starts closed unless times are set, where the schedule is an extra. */
  collapsible?: boolean
}>()

const { t, locale } = useI18n()
const id = useId()

const hasTimes = (day: ScheduleDayForm | undefined): boolean =>
  !!day && (day.arriveBy !== '' || day.returnFrom !== '')
const open = ref(!props.collapsible || schedule.value.some(hasTimes))

// Monday, 12 October 2026, and the days after it give the names of the weekdays.
const dayName = (weekday: Weekday, style: 'long' | 'short'): string =>
  new Intl.DateTimeFormat(formattingLocale(locale.value), {
    weekday: style,
    timeZone: 'UTC',
  }).format(Date.UTC(2026, 9, 11 + weekday))

const monday = computed(() => schedule.value.find((day) => day.weekday === 1))
const hasError = (weekday: Weekday): boolean => props.errors?.includes(weekday) ?? false

/** Gives Tuesday to Friday the times of Monday. */
function copyMonday(): void {
  const first = monday.value
  if (!first) return
  for (const day of schedule.value) {
    if (day.weekday < 2 || day.weekday > 5) continue
    day.arriveBy = first.arriveBy
    day.returnFrom = first.returnFrom
  }
}
</script>

<template>
  <div
    class="flex flex-col gap-3"
    :role="collapsible ? 'group' : undefined"
    :aria-labelledby="collapsible ? `${id}-title` : undefined"
  >
    <div class="flex flex-col gap-1">
      <button
        v-if="collapsible"
        type="button"
        class="toggle"
        :aria-expanded="open"
        :aria-controls="`${id}-days`"
        @click="open = !open"
      >
        <span :id="`${id}-title`">{{ t('editor.schedule.label') }}</span>
        <IconChevronDown aria-hidden="true" class="chevron" :class="{ open }" />
      </button>
      <p class="text-sm text-pretty text-ink-subtle">{{ t('editor.schedule.hint') }}</p>
    </div>

    <div v-show="open" :id="`${id}-days`" class="flex flex-col gap-3">
      <div class="days">
        <span aria-hidden="true" />
        <span class="column" aria-hidden="true">{{ t('editor.schedule.arriveBy') }}</span>
        <span class="column" aria-hidden="true">{{ t('editor.schedule.returnFrom') }}</span>
        <template v-for="day in schedule" :key="day.weekday">
          <span class="day" aria-hidden="true">{{ dayName(day.weekday, 'short') }}</span>
          <input
            v-model="day.arriveBy"
            type="time"
            class="field"
            :aria-label="t('editor.schedule.arriveByOn', { day: dayName(day.weekday, 'long') })"
            :aria-invalid="hasError(day.weekday) ? 'true' : undefined"
            :aria-describedby="hasError(day.weekday) ? `${id}-error-${day.weekday}` : undefined"
          />
          <input
            v-model="day.returnFrom"
            type="time"
            class="field"
            :aria-label="t('editor.schedule.returnFromOn', { day: dayName(day.weekday, 'long') })"
            :aria-invalid="hasError(day.weekday) ? 'true' : undefined"
            :aria-describedby="hasError(day.weekday) ? `${id}-error-${day.weekday}` : undefined"
          />
          <p
            v-if="hasError(day.weekday)"
            :id="`${id}-error-${day.weekday}`"
            class="col-span-3 -mt-1 text-sm font-medium text-late"
          >
            {{ t('editor.errors.returnBeforeArrival') }}
          </p>
        </template>
      </div>
      <BaseButton v-if="hasTimes(monday)" variant="quiet" class="self-start" @click="copyMonday">
        <IconCopy aria-hidden="true" />
        {{ t('editor.schedule.copyMonday') }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  border-radius: 0.75rem;
  font-weight: 600;
  text-align: start;
}

.chevron {
  flex: none;
  color: var(--color-ink-subtle);
  transition: rotate 0.2s ease;
}

.chevron.open {
  rotate: 180deg;
}

.days {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem 0.625rem;
}

.column {
  color: var(--color-ink-subtle);
  font-size: 0.8125rem;
  font-weight: 600;
}

.day {
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}
</style>
