<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import IconRoute from '~icons/tabler/route'

import BaseButton from '../components/BaseButton.vue'
import EmptyState from '../components/EmptyState.vue'
import { useDialog } from '../composables/use-dialog'
import { useLocationPreference } from '../composables/use-location-preference'
import { useNow } from '../composables/use-now'
import NowBoard from '../now/NowBoard.vue'
import RouteSwitcher from '../now/RouteSwitcher.vue'
import { useDeviceLocation } from '../now/use-device-location'
import { useRouteChoice } from '../now/use-route-choice'
import { useRouteStore } from '../stores/routes'

const LinkImportDialog = defineAsyncComponent(() => import('../routes/LinkImportDialog.vue'))

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
</script>

<template>
  <div v-if="choice.route.value" class="flex flex-col gap-[clamp(0.875rem,1.3vw,2rem)]">
    <NowBoard
      :route="choice.route.value"
      :direction="choice.direction.value"
      :now
      @swap="choice.swap"
    >
      <template #title>
        <h1 class="sr-only">{{ t('now.title') }}</h1>
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
