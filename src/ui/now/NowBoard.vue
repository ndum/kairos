<script setup lang="ts">
import { useOnline } from '@vueuse/core'
import { computed, onUnmounted, toRef, watch, watchEffect } from 'vue'

import type { MonitorSnapshot } from '@/application/trip-monitor'

import { ridesOf } from '@/domain/journey'
import { type Direction, type Route, oppositeDirection } from '@/domain/route'
import type { Instant } from '@/domain/time'
import { urgencyOf } from '@/domain/urgency'

import { useSceneStore } from '../stores/scene'
import HeroCard from './HeroCard.vue'
import JourneyCard from './JourneyCard.vue'
import LiveStatus from './LiveStatus.vue'
import OppositeCard from './OppositeCard.vue'
import UpcomingCard from './UpcomingCard.vue'
import { useLiveBoard } from './use-live-board'

const props = defineProps<{ route: Route; direction: Direction; now: Instant }>()

const emit = defineEmits<{ swap: [] }>()

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
      @retry="primary.refresh"
    />
    <JourneyCard
      v-if="primary.board.value.main"
      class="journey"
      :trip="primary.board.value.main"
      :ends="primary.endpoints.value"
    />
    <div class="side">
      <UpcomingCard :trips="primary.board.value.upcoming" />
      <OppositeCard
        :board="secondary.board.value"
        :ends="secondary.endpoints.value"
        :now
        :status="secondary.snapshot.value.status"
        @swap="emit('swap')"
      />
    </div>
  </div>
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
