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

import NowBoard from '../now/NowBoard.vue'
import RouteSwitcher from '../now/RouteSwitcher.vue'
import { useDeviceLocation } from '../now/use-device-location'
import { useRouteChoice } from '../now/use-route-choice'
import { usePinStore } from '../stores/pin'
import { useRouteStore } from '../stores/routes'

const LinkImportDialog = defineAsyncComponent(() => import('../routes/LinkImportDialog.vue'))
// Only needed while a trip is pinned.
const PinnedCard = defineAsyncComponent(() => import('../now/PinnedCard.vue'))

const { t } = useI18n()
const store = useRouteStore()
const now = useNow()
const location = useDeviceLocation(useLocationPreference())
const choice = useRouteChoice(
  computed(() => store.routes),
  now,
  location,
)
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
</script>

<template>
  <h1 tabindex="-1" class="sr-only">{{ t('now.title') }}</h1>

  <div v-if="choice.route.value" class="flex flex-col gap-[clamp(0.875rem,1.3vw,2rem)]">
    <NowBoard
      :route="choice.route.value"
      :direction="choice.direction.value"
      :now
      @swap="choice.swap"
    >
      <template #before>
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
        <p v-else class="text-2xl font-bold tracking-tight">{{ choice.route.value.name }}</p>
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
