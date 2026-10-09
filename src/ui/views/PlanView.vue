<script setup lang="ts">
import { computed, ref, shallowRef, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCalendarTime from '~icons/tabler/calendar-time'
import IconClock from '~icons/tabler/clock'
import IconLoader from '~icons/tabler/loader-2'

import type { PlanMode } from '@/application/planning'
import { fromLocal, toLocal } from '@/domain/local-time'
import { type Direction, endpoints } from '@/domain/route'
import { MINUTE } from '@/domain/time'
import type { Trip } from '@/domain/trip'

import BaseButton from '../components/BaseButton.vue'
import EmptyState from '../components/EmptyState.vue'
import GlassCard from '../components/GlassCard.vue'
import SegmentedControl from '../components/SegmentedControl.vue'
import { useDialog } from '../composables/use-dialog'
import { useNow } from '../composables/use-now'
import RouteSwitcher from '../now/RouteSwitcher.vue'
import { useRouteChoice } from '../now/use-route-choice'
import PlanResult from '../plan/PlanResult.vue'
import TripSheet from '../plan/TripSheet.vue'
import { usePlan } from '../plan/use-plan'
import { useServices } from '../services'
import { usePinStore } from '../stores/pin'
import { useRouteStore } from '../stores/routes'
import { useToastStore } from '../stores/toasts'

const { t } = useI18n()
const { clock } = useServices()
const store = useRouteStore()
const pins = usePinStore()
const toasts = useToastStore()
const now = useNow()
const choice = useRouteChoice(
  computed(() => store.routes),
  now,
)

const dateId = useId()
const timeId = useId()
const resultsId = useId()

// The plan starts from the direction shown on the board, at the next full five minutes.
const direction = ref<Direction>(choice.direction.value)
watch(
  () => choice.route.value?.id,
  () => {
    direction.value = choice.direction.value
  },
)

const mode = ref<PlanMode>('depart')
const start = toLocal(Math.ceil(clock.now() / (5 * MINUTE)) * 5 * MINUTE)
const date = ref(start.date)
const time = ref(start.time)

function setNow(): void {
  const current = toLocal(clock.now())
  date.value = current.date
  time.value = current.time
  mode.value = 'depart'
}

const input = computed(() => {
  const route = choice.route.value
  if (!route || !date.value || !time.value) return null
  return {
    route,
    direction: direction.value,
    request: { mode: mode.value, at: fromLocal(date.value, time.value) },
  }
})
const { plan, status, retry } = usePlan(input)

const ends = computed(() =>
  choice.route.value ? endpoints(choice.route.value, direction.value) : null,
)

const directions = computed(() => {
  const route = choice.route.value
  if (!route) return []
  const [first, second] = route.places
  return [
    { value: 'outbound', label: `${first.name} → ${second.name}` },
    { value: 'return', label: `${second.name} → ${first.name}` },
  ] as const
})

const modes = computed(
  () =>
    [
      { value: 'depart', label: t('plan.mode.depart') },
      { value: 'arrive', label: t('plan.mode.arrive') },
    ] as const,
)

const sheet = useDialog()
const selected = shallowRef<Trip | null>(null)

function showDetails(trip: Trip): void {
  selected.value = trip
  sheet.show()
}

function pin(trip: Trip): void {
  const route = choice.route.value
  if (!route) return
  pins.pin(route, direction.value, trip)
  toasts.show(t('plan.pinnedToast'))
}
</script>

<template>
  <EmptyState
    v-if="!choice.route.value"
    :icon="IconCalendarTime"
    :title="t('plan.empty.title')"
    :text="t('plan.empty.text')"
    :action="{ label: t('plan.empty.action'), to: { name: 'routes' } }"
  />

  <div v-else class="flex flex-col gap-5">
    <h1 class="text-3xl font-bold tracking-tight">{{ t('plan.title') }}</h1>

    <div class="layout">
      <GlassCard tag="form" :lift="false" class="panel flex flex-col gap-5" @submit.prevent="retry">
        <RouteSwitcher
          v-if="store.routes.length > 1"
          :routes="store.routes"
          :selected="choice.route.value.id"
          @select="choice.select"
        />
        <SegmentedControl v-model="direction" :label="t('plan.direction')" :options="directions" />
        <SegmentedControl v-model="mode" :label="t('plan.mode.label')" :options="modes" />
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-2">
            <label :for="dateId" class="font-semibold">{{ t('plan.date') }}</label>
            <input :id="dateId" v-model="date" type="date" class="field" required />
          </div>
          <div class="flex flex-col gap-2">
            <label :for="timeId" class="font-semibold">{{ t('plan.time') }}</label>
            <input :id="timeId" v-model="time" type="time" class="field" required />
          </div>
        </div>
        <BaseButton variant="quiet" class="self-start" @click="setNow">
          <IconClock aria-hidden="true" />
          {{ t('plan.now') }}
        </BaseButton>
      </GlassCard>

      <section
        class="flex flex-col gap-3"
        :aria-labelledby="resultsId"
        :aria-busy="status === 'loading'"
      >
        <h2 :id="resultsId" class="text-xl font-semibold tracking-tight">
          {{ t('plan.results') }}
        </h2>

        <p v-if="status === 'loading' && !plan" class="flex items-center gap-2 text-ink-muted">
          <IconLoader aria-hidden="true" class="animate-spin" />
          {{ t('plan.loading') }}
        </p>
        <div v-else-if="status === 'failed'" class="flex flex-col items-start gap-3">
          <p class="text-ink-muted">{{ t('plan.failed') }}</p>
          <BaseButton @click="retry">{{ t('plan.retry') }}</BaseButton>
        </div>
        <template v-else-if="plan">
          <p
            v-if="plan.trips.length === 0 && plan.alternatives.length === 0"
            class="text-ink-muted"
          >
            {{ t('plan.none') }}
          </p>
          <ol class="results">
            <li v-for="trip in plan.trips" :key="trip.leaveAt">
              <PlanResult
                :trip
                :recommended="trip === plan.recommended"
                :pinned="pins.isPinned(trip)"
                @details="showDetails(trip)"
                @pin="pin(trip)"
              />
            </li>
          </ol>
          <template v-if="plan.alternatives.length > 0">
            <h3 class="mt-2 font-semibold text-ink-muted">{{ t('plan.alternatives') }}</h3>
            <ol class="results">
              <li v-for="trip in plan.alternatives" :key="trip.leaveAt">
                <PlanResult
                  :trip
                  :recommended="false"
                  :pinned="pins.isPinned(trip)"
                  @details="showDetails(trip)"
                  @pin="pin(trip)"
                />
              </li>
            </ol>
          </template>
        </template>
      </section>
    </div>

    <TripSheet
      v-if="sheet.used.value && selected && ends"
      v-model:open="sheet.open.value"
      :trip="selected"
      :ends
      :pinned="pins.isPinned(selected)"
      @pin="pin(selected)"
      @unpin="pins.unpin"
    />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  align-items: start;
  gap: clamp(0.875rem, 1.3vw, 2rem);
}

.results {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
}

@media (min-width: 900px) {
  .layout {
    grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
  }

  .panel {
    position: sticky;
    top: 1rem;
  }
}
</style>
