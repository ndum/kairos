<script setup lang="ts">
import { useOnline } from '@vueuse/core'
import {
  computed,
  defineAsyncComponent,
  onUnmounted,
  shallowRef,
  toRef,
  watch,
  watchEffect,
} from 'vue'
import { useI18n } from 'vue-i18n'

import type { MonitorSnapshot } from '@/application/trip-monitor'

import { ridesOf } from '@/domain/journey'
import {
  type Direction,
  type Endpoints,
  type Route,
  endpoints,
  oppositeDirection,
} from '@/domain/route'
import type { Instant } from '@/domain/time'
import type { Trip } from '@/domain/trip'
import { urgencyOf } from '@/domain/urgency'

import { useDialog } from '../composables/use-dialog'
import { usePinStore } from '../stores/pin'
import { useSceneStore } from '../stores/scene'
import { useToastStore } from '../stores/toasts'
import type { DirectionNote } from './direction-note'
import HeroCard from './HeroCard.vue'
import JourneyCard from './JourneyCard.vue'
import LiveStatus from './LiveStatus.vue'
import OppositeCard from './OppositeCard.vue'
import UpcomingCard from './UpcomingCard.vue'
import { useLiveBoard } from './use-live-board'

const props = defineProps<{
  route: Route
  direction: Direction
  now: Instant
  directionNote?: DirectionNote | null
}>()

const emit = defineEmits<{ swap: [] }>()

// Only needed once the user opens the details of a trip.
const TripSheet = defineAsyncComponent(() => import('../plan/TripSheet.vue'))

const { t } = useI18n()

const route = toRef(props, 'route')
const now = toRef(props, 'now')
const primary = useLiveBoard(route, toRef(props, 'direction'), now)
const secondary = useLiveBoard(
  route,
  computed(() => oppositeDirection(props.direction)),
  now,
)

// The device knows first when it goes offline. Back online, both directions catch up at once.
const online = useOnline()
watch(online, (isOnline) => {
  if (!isOnline) return
  primary.refresh()
  secondary.refresh()
})
const status = computed<MonitorSnapshot>(() => {
  const snapshot = primary.snapshot.value
  if (online.value) return snapshot
  return { ...snapshot, status: snapshot.fetchedAt === null ? 'error' : 'stale' }
})

// The panorama follows the main trip: its urgency colours the sky and its train arrives.
const scene = useSceneStore()
watchEffect(() => {
  const { main, tight } = primary.board.value
  const trip = main ?? tight
  const firstRide = trip ? ridesOf(trip.journey)[0] : undefined
  scene.show({
    urgency: trip ? urgencyOf(trip, props.now) : null,
    stationName: firstRide?.departure.stop.name ?? null,
    departureAt: trip?.departureAt ?? null,
  })
})
onUnmounted(scene.clear)

// The details of a later trip or of the next trip back, which the user may also pin.
const pins = usePinStore()
const toasts = useToastStore()
const sheet = useDialog()
const selected = shallowRef<{ trip: Trip; direction: Direction; ends: Endpoints } | null>(null)

function showDetails(trip: Trip, direction: Direction): void {
  selected.value = { trip, direction, ends: endpoints(props.route, direction) }
  sheet.show()
}

function pin({ trip, direction }: { trip: Trip; direction: Direction }): void {
  pins.pin(props.route, direction, trip)
  toasts.show(t('plan.pinnedToast'))
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <slot name="title" />
    <LiveStatus class="ml-auto" :snapshot="status" @refresh="primary.refresh" />
  </div>

  <slot name="before" />

  <div class="bento">
    <HeroCard
      class="hero"
      :board="primary.board.value"
      :ends="primary.endpoints.value"
      :now
      :status="primary.snapshot.value.status"
      :direction-note
      @retry="primary.refresh"
    />
    <JourneyCard
      v-if="primary.board.value.main"
      class="journey"
      :trip="primary.board.value.main"
      :ends="primary.endpoints.value"
    />
    <div class="side">
      <UpcomingCard
        :trips="primary.board.value.upcoming"
        @details="(trip) => showDetails(trip, direction)"
      />
      <OppositeCard
        :board="secondary.board.value"
        :ends="secondary.endpoints.value"
        :now
        :status="secondary.snapshot.value.status"
        @swap="emit('swap')"
        @details="(trip) => showDetails(trip, oppositeDirection(direction))"
      />
    </div>
  </div>

  <TripSheet
    v-if="sheet.used.value && selected"
    v-model:open="sheet.open.value"
    :trip="selected.trip"
    :ends="selected.ends"
    :pinned="pins.isPinned(selected.trip)"
    @pin="pin(selected)"
    @unpin="pins.unpin"
  />
</template>

<style scoped>
.bento {
  display: grid;
  grid-template-areas: 'hero' 'journey' 'side';
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: clamp(0.875rem, 1.3vw, 2rem);
}

.hero {
  grid-area: hero;
}

.journey {
  grid-area: journey;
}

.side {
  display: grid;
  grid-area: side;
  align-content: start;
  gap: inherit;
}

@media (min-width: 900px) {
  .bento {
    grid-template-areas: 'hero journey' 'side side';
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.45fr);
  }

  .side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1500px) {
  .bento {
    grid-template-areas: 'hero journey side';
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) minmax(0, 1fr);
  }

  .side {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
