<script setup lang="ts">
import { computed, defineAsyncComponent, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import IconRoute from '~icons/tabler/route'

import BaseButton from '../components/BaseButton.vue'
import EmptyState from '../components/EmptyState.vue'
import { useDialog } from '../composables/use-dialog'
import { useAwakePreference, useKeepAwake } from '../composables/use-keep-awake'
import { useLocationPreference } from '../composables/use-location-preference'
import { useNow } from '../composables/use-now'
import { HOUR } from '@/domain/time'

import { directionNoteOf } from '../now/direction-note'
import NowBoard from '../now/NowBoard.vue'
import RouteSwitcher from '../now/RouteSwitcher.vue'
import { useDeviceLocation } from '../now/use-device-location'
import { useRouteChoice } from '../now/use-route-choice'
import { usePinStore } from '../stores/pin'
import { useRideStore } from '../stores/ride'
import { useRouteStore } from '../stores/routes'

const LinkImportDialog = defineAsyncComponent(() => import('../routes/LinkImportDialog.vue'))
// Only needed while a trip is pinned.
const PinnedCard = defineAsyncComponent(() => import('../now/PinnedCard.vue'))
// Only needed while the user is on the way.
const RideCard = defineAsyncComponent(() => import('../now/RideCard.vue'))

const { t } = useI18n()
const store = useRouteStore()
const now = useNow()
const location = useDeviceLocation(useLocationPreference())
const choice = useRouteChoice(
  computed(() => store.routes),
  now,
  computed(() => (location.value.kind === 'found' ? location.value.coordinates : null)),
)
const directionNote = computed(() => directionNoteOf(choice.basis.value, location.value))
const linkImport = useDialog()
useKeepAwake(useAwakePreference())

const pins = usePinStore()
const pinnedRoute = computed(
  () => store.routes.find(({ id }) => id === pins.pinned?.routeId) ?? null,
)

// A pinned trip is forgotten once it lies well behind, or when its route is gone.
watchEffect(() => {
  const pinned = pins.pinned
  if (!pinned) return
  if (!pinnedRoute.value || now.value > pinned.departureAt + 2 * HOUR) pins.unpin()
})

const rides = useRideStore()
const rideRoute = computed(() => store.routes.find(({ id }) => id === rides.ride?.routeId) ?? null)
// The ride shows from the time the user had to leave. The card itself notices the arrival,
// this only catches rides that are long over or whose route is gone.
const onTheWay = computed(
  () => !!rides.ride && !!rideRoute.value && now.value >= rides.ride.leaveAt,
)
watchEffect(() => {
  const ride = rides.ride
  if (!ride) return
  if (!rideRoute.value || now.value > ride.departureAt + 4 * HOUR) rides.forget()
})
</script>

<template>
  <h1 tabindex="-1" class="sr-only">{{ t('now.title') }}</h1>

  <div v-if="choice.route.value" class="flex flex-col gap-[clamp(0.875rem,1.3vw,2rem)]">
    <NowBoard
      :route="choice.route.value"
      :direction="choice.direction.value"
      :direction-note
      :now
      @swap="choice.swap"
    >
      <template #before>
        <RideCard
          v-if="onTheWay && rides.ride && rideRoute"
          :ride="rides.ride"
          :route="rideRoute"
          :now
          @dismiss="rides.dismiss"
          @arrived="rides.forget"
          @observe="rides.observe"
        />
        <PinnedCard
          v-if="pins.pinned && pinnedRoute"
          :pinned="pins.pinned"
          :route="pinnedRoute"
          :now
          @unpin="pins.unpin"
        />
      </template>
      <template #title>
        <RouteSwitcher
          v-if="store.routes.length > 1"
          :routes="store.routes"
          :selected="choice.route.value.id"
          @select="choice.select"
        />
        <p v-else class="title">{{ choice.route.value.name }}</p>
      </template>
    </NowBoard>
  </div>

  <template v-else>
    <EmptyState
      :icon="IconRoute"
      :title="t('now.empty.title')"
      :text="t('now.empty.text')"
      :action="{ label: t('now.empty.action'), to: { name: 'route-new' } }"
    >
      <BaseButton variant="quiet" @click="linkImport.show">
        {{ t('linkImport.emptyAction') }}
      </BaseButton>
    </EmptyState>
    <LinkImportDialog v-if="linkImport.used.value" v-model:open="linkImport.open.value" />
  </template>
</template>

<style scoped>
.title {
  font-size: 1.375rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

@media (min-width: 900px) {
  .title {
    font-size: 2.125rem;
    letter-spacing: -0.02em;
  }
}
</style>
