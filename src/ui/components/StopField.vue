<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconMapPin from '~icons/tabler/map-pin'

import { MIN_QUERY_LENGTH } from '@/application/stop-search'
import type { StopRef } from '@/domain/route'

import { useSearch } from '../composables/use-search'
import { useServices } from '../services'
import SearchField from './SearchField.vue'

const model = defineModel<StopRef | null>({ required: true })

defineProps<{
  label: string
  error?: string
  hint?: string
  placeholder?: string
}>()

const { t } = useI18n()
const { stops } = useServices()
const { results, status, search } = useSearch((text, signal) => stops.find(text, signal), {
  minLength: MIN_QUERY_LENGTH,
})

const messages = {
  noResults: t('stopField.noResults'),
  failed: t('stopField.failed'),
  found: (count: number) => t('stopField.found', count),
}
</script>

<template>
  <SearchField
    v-model="model"
    :label
    :error
    :hint
    :placeholder
    :results
    :status
    :key-of="(stop) => stop.id"
    :text-of="(stop) => stop.name"
    :messages
    @search="search"
  >
    <template #option="{ item }">
      <IconMapPin aria-hidden="true" class="flex-none text-ink-subtle" />
      {{ item.name }}
    </template>
  </SearchField>
</template>
