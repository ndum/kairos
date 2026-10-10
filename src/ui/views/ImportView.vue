<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import IconLinkOff from '~icons/tabler/link-off'

import { type ImportItem, planImport } from '@/application/route-sharing'

import BaseButton from '../components/BaseButton.vue'
import EmptyState from '../components/EmptyState.vue'
import GlassCard from '../components/GlassCard.vue'
import { useServices } from '../services'
import { useRouteStore } from '../stores/routes'
import { useToastStore } from '../stores/toasts'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { codec } = useServices()
const store = useRouteStore()
const toasts = useToastStore()

const state = ref<'reading' | 'ready' | 'invalid'>('reading')
const items = shallowRef<ImportItem[]>([])

watch(
  () => route.query.r,
  async (code) => {
    state.value = 'reading'
    try {
      const routes = await codec.decode(typeof code === 'string' ? code : '')
      items.value = planImport(store.routes, routes)
      state.value = 'ready'
    } catch {
      state.value = 'invalid'
    }
  },
  { immediate: true },
)

const importable = computed(() =>
  items.value.filter(({ status }) => status === 'new' || status === 'changed'),
)

function accept(): void {
  const { added, updated } = store.merge(importable.value.map((item) => item.route))
  toasts.show(t('import.done', added + updated))
  // Replacing the entry keeps the import out of the history, so Back does not repeat it.
  void router.replace({ name: 'routes' })
}
</script>

<template>
  <template v-if="state === 'invalid'">
    <h1 tabindex="-1" class="sr-only">{{ t('import.title') }}</h1>
    <EmptyState
      :icon="IconLinkOff"
      :title="t('import.invalid.title')"
      :text="t('import.invalid.text')"
      :action="{ label: t('import.invalid.action'), to: { name: 'routes' } }"
    />
  </template>

  <div v-else-if="state === 'ready'" class="mx-auto flex w-full max-w-2xl flex-col gap-5">
    <h1 tabindex="-1" class="text-3xl font-bold tracking-tight sky-text outline-none">
      {{ t('import.title') }}
    </h1>

    <GlassCard class="flex flex-col gap-6">
      <p class="text-pretty text-ink-muted">{{ t('import.text') }}</p>

      <ul class="flex flex-col gap-3">
        <li
          v-for="{ route: shared, status } in items"
          :key="shared.id"
          class="item flex items-start justify-between gap-4 rounded-inner px-4 py-3"
        >
          <div class="min-w-0 break-words">
            <p class="font-semibold">{{ shared.name }}</p>
            <p class="text-sm text-ink-muted">
              {{ shared.places[0].stop.name }} ↔ {{ shared.places[1].stop.name }}
            </p>
          </div>
          <span
            class="status flex-none rounded-full px-3 py-1 text-sm font-semibold"
            :class="status"
          >
            {{ t(`import.status.${status}`) }}
          </span>
        </li>
      </ul>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BaseButton variant="quiet" :to="{ name: 'routes' }">{{ t('import.cancel') }}</BaseButton>
        <BaseButton variant="primary" :disabled="importable.length === 0" @click="accept">
          {{ t('import.accept', importable.length) }}
        </BaseButton>
      </div>
    </GlassCard>
  </div>
</template>

<style scoped>
.item {
  border: 1px solid var(--color-hairline);
  background: var(--color-glass-soft);
}

.status {
  background: var(--color-glass);
  color: var(--color-ink-muted);
}

.status.new {
  background: var(--color-go-soft);
  color: var(--color-ink);
}

.status.changed {
  background: var(--color-soon-soft);
  color: var(--color-ink);
}

.status.invalid {
  background: var(--color-late-soft);
  color: var(--color-ink);
}
</style>
