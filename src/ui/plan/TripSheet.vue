<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconPinned from '~icons/tabler/pinned'
import IconPinnedOff from '~icons/tabler/pinned-off'

import type { Endpoints } from '@/domain/route'
import { transferRiskOf } from '@/domain/transfer'
import type { Trip } from '@/domain/trip'

import AppDialog from '../components/AppDialog.vue'
import BaseButton from '../components/BaseButton.vue'
import { useFormat } from '../composables/use-format'
import DirectionTag from '../now/DirectionTag.vue'
import ItineraryBar from '../now/ItineraryBar.vue'
import { segmentsOf } from '../now/itinerary'
import TransferRiskTag from '../now/TransferRiskTag.vue'
import TripTimeline from '../now/TripTimeline.vue'

// Details of a trip as a sheet: the bar, every step and a button to pin or unpin it.

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{ trip: Trip; ends: Endpoints; pinned: boolean }>()

const emit = defineEmits<{ pin: []; unpin: [] }>()

const { t } = useI18n()
const format = useFormat()

const segments = computed(() => segmentsOf(props.trip, props.ends))
const risk = computed(() => transferRiskOf(props.trip.journey))
</script>

<template>
  <AppDialog
    v-model:open="open"
    :title="t('plan.sheet.title', { time: format.time(trip.leaveAt) })"
  >
    <div class="flex flex-wrap items-center gap-2">
      <DirectionTag :ends />
      <TransferRiskTag v-if="risk !== 'ok'" :risk />
    </div>
    <ItineraryBar :segments />
    <TripTimeline :trip :ends />
    <BaseButton
      :variant="pinned ? 'secondary' : 'primary'"
      class="self-start"
      @click="pinned ? emit('unpin') : emit('pin')"
    >
      <IconPinnedOff v-if="pinned" aria-hidden="true" />
      <IconPinned v-else aria-hidden="true" />
      {{ pinned ? t('plan.unpin') : t('plan.pin') }}
    </BaseButton>
  </AppDialog>
</template>
