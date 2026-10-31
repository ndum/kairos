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
import IconCalendarTime from '~icons/tabler/calendar-time'
import IconClock from '~icons/tabler/clock'
import IconCurrentLocation from '~icons/tabler/current-location'

import type { MonitorSnapshot, MonitorStatus } from '@/application/trip-monitor'

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
import { usePreferLines } from '../composables/use-prefer-lines'
import { usePinStore } from '../stores/pin'
import { useRideStore } from '../stores/ride'
import { useSceneStore } from '../stores/scene'
import { useToastStore } from '../stores/toasts'
import type { DirectionNote } from './direction-note'
import HeroCard from './HeroCard.vue'
import JourneyCard from './JourneyCard.vue'
import LiveStatus from './LiveStatus.vue'
import OppositeCard from './OppositeCard.vue'
import OutageNotice from './OutageNotice.vue'
import UpcomingCard from './UpcomingCard.vue'
import { useCountdownTitle } from './use-countdown-title'
import { useLiveBoard } from './use-live-board'
import { useTripWeather } from './use-trip-weather'

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

// Online, a failed refresh means the timetable itself is down. The cards then say so instead
// of claiming there are no trips, since the cached ones may all have left already.
const disrupted = computed(() => online.value && primary.snapshot.value.error !== null)
const cardStatus = (snapshot: MonitorSnapshot): MonitorStatus =>
  online.value && snapshot.error !== null && snapshot.status === 'stale' ? 'error' : snapshot.status

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

// Shortly before leaving, the main trip becomes the ride the user is probably on.
const rides = useRideStore()
watchEffect(() => {
  const { main } = primary.board.value
  if (main) rides.follow(props.route, props.direction, main, props.now)
})

useCountdownTitle(
  computed(() => primary.board.value.main?.leaveAt ?? null),
  now,
)

const weather = useTripWeather(
  computed(() => primary.board.value.main),
  primary.endpoints,
)

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

const isMissed = (trip: Trip): boolean => urgencyOf(trip, props.now) === 'missed'

const { prefers, prefer } = usePreferLines()
const canPrefer = computed(() => !!selected.value && !prefers(props.route, selected.value.trip))
</script>

<template>
  <div class="head flex flex-wrap items-end justify-between gap-x-4 gap-y-2.5 sky-text">
    <div class="flex min-w-0 flex-col items-start gap-2">
      <slot name="title" />
      <p v-if="directionNote" class="pill">
        <IconCurrentLocation
          v-if="directionNote === 'location' || directionNote === 'locating'"
          aria-hidden="true"
        />
        <IconCalendarTime v-else-if="directionNote === 'schedule'" aria-hidden="true" />
        <IconClock v-else aria-hidden="true" />
        {{ t(`now.directionNote.${directionNote}`) }}
      </p>
    </div>
    <LiveStatus :snapshot="status" :disrupted @refresh="primary.refresh" />
  </div>

  <slot name="before" />

  <OutageNotice v-if="disrupted" :stale="primary.snapshot.value.fetchedAt !== null" />

  <div class="board">
    <HeroCard
      class="hero"
      :board="primary.board.value"
      :ends="primary.endpoints.value"
      :now
      :status="cardStatus(primary.snapshot.value)"
      :weather
      @retry="primary.refresh"
    />
    <JourneyCard
      v-if="primary.board.value.main"
      class="journey"
      :trip="primary.board.value.main"
      :ends="primary.endpoints.value"
      @details="showDetails(primary.board.value.main, direction)"
    />
    <div class="side">
      <UpcomingCard
        :trips="primary.board.value.upcoming"
        :earlier="primary.board.value.target?.kind === 'arrive' && !primary.board.value.late"
        :missed="primary.board.value.missed"
        @details="(trip) => showDetails(trip, direction)"
      />
      <OppositeCard
        :board="secondary.board.value"
        :ends="secondary.endpoints.value"
        :status="cardStatus(secondary.snapshot.value)"
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
    :can-prefer
    :can-pin="!isMissed(selected.trip)"
    @pin="pin(selected)"
    @unpin="pins.unpin"
    @prefer="prefer(route, selected.trip)"
  />
</template>

<style scoped>
/* The title, the hint on the direction and the live state sit on the sky. */
.head {
  color: var(--color-on-sky);
}

.board {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 0.875rem;
}

.side {
  display: grid;
  align-content: start;
  gap: inherit;
}

@media (min-width: 900px) {
  .head {
    padding-top: 0.5rem;
  }

  .board {
    grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
    grid-template-areas:
      'hero side'
      'journey side';
    gap: 1.375rem;
  }

  .hero {
    grid-area: hero;
  }

  .journey {
    grid-area: journey;
  }

  .side {
    grid-area: side;
  }
}
</style>
