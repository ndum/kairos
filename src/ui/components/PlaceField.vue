<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconBuilding from '~icons/tabler/building'
import IconHome from '~icons/tabler/home'

import { MIN_PLACE_QUERY_LENGTH } from '@/application/place-finder'
import type { FoundPlace } from '@/application/ports/place-search'

import { useSearch } from '../composables/use-search'
import { useServices } from '../services'
import SearchField from './SearchField.vue'

// Finds a street address or a company. The services allow only a few searches a minute, so
// the search waits a little longer for the user to pause than the one for stops.

const model = defineModel<FoundPlace | null>({ required: true })

defineProps<{
  label: string
  hint?: string
  placeholder?: string
}>()

const { t } = useI18n()
const { places } = useServices()
const { results, status, search } = useSearch((text, signal) => places.find(text, signal), {
  minLength: MIN_PLACE_QUERY_LENGTH,
  delay: 400,
})

const messages = {
  noResults: t('placeField.noResults'),
  failed: t('placeField.failed'),
  found: (count: number) => t('placeField.found', count),
}
</script>

<template>
  <SearchField
    v-model="model"
    :label
    :hint
    :placeholder
    :results
    :status
    :key-of="(place) => `${place.kind}:${place.name}`"
    :text-of="(place) => place.name"
    :messages
    @search="search"
  >
    <template #option="{ item }">
      <IconBuilding
        v-if="item.kind === 'poi'"
        aria-hidden="true"
        class="flex-none text-ink-subtle"
      />
      <IconHome v-else aria-hidden="true" class="flex-none text-ink-subtle" />
      {{ item.name }}
    </template>
  </SearchField>
</template>
