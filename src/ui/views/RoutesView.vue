<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '~icons/tabler/alert-triangle'
import IconMapPin from '~icons/tabler/map-pin'
import IconPlus from '~icons/tabler/plus'

import BaseButton from '../components/BaseButton.vue'
import EmptyState from '../components/EmptyState.vue'
import RouteCard from '../routes/RouteCard.vue'
import { useRouteStore } from '../stores/routes'
import { useToastStore } from '../stores/toasts'

const { t } = useI18n()
const store = useRouteStore()
const toasts = useToastStore()

function remove(id: string): void {
  const removed = store.remove(id)
  if (!removed) return
  toasts.show(t('routes.removed', { name: removed.route.name }), {
    label: t('routes.undo'),
    run: () => {
      store.restore(removed)
    },
  })
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-3xl font-bold tracking-tight">{{ t('routes.title') }}</h1>
      <BaseButton v-if="store.routes.length > 0" variant="primary" :to="{ name: 'route-new' }">
        <IconPlus aria-hidden="true" />
        {{ t('routes.add') }}
      </BaseButton>
    </div>

    <p v-if="!store.saved" role="alert" class="glass flex gap-3 rounded-inner p-4 font-medium">
      <IconAlertTriangle aria-hidden="true" class="mt-0.5 flex-none text-soon" />
      {{ t('routes.notSaved') }}
    </p>

    <EmptyState
      v-if="store.routes.length === 0"
      :icon="IconMapPin"
      :title="t('routes.empty.title')"
      :text="t('routes.empty.text')"
      :action="{ label: t('routes.empty.action'), to: { name: 'route-new' } }"
    />

    <TransitionGroup v-else tag="ol" name="list" class="route-grid grid gap-4">
      <li v-for="(route, index) in store.routes" :key="route.id">
        <RouteCard
          :route
          :first="index === 0"
          :last="index === store.routes.length - 1"
          @move="(offset) => store.move(route.id, offset)"
          @remove="remove(route.id)"
        />
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.route-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 24rem), 1fr));
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition:
    opacity 0.3s,
    transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.list-leave-active {
  position: absolute;
}
</style>
