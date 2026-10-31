<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '~icons/tabler/alert-triangle'

import { oftenLate, punctualityOf } from '@/domain/punctuality'
import { MINUTE } from '@/domain/time'

import LineBadge from '../components/LineBadge.vue'
import { useServices } from '../services'
import { useDelayStore } from '../stores/delays'

// How punctual the lines of the route were on the user's own rides, as far as Kairos saw them.

const props = defineProps<{ routeId: string }>()

const { t } = useI18n()
const { clock } = useServices()
const delays = useDelayStore()

const lines = computed(() => punctualityOf(delays.records, props.routeId, clock.now()))
</script>

<template>
  <div v-if="lines.length > 0" class="flex flex-col gap-2">
    <p class="text-sm font-semibold text-ink-muted">{{ t('routes.punctuality.title') }}</p>
    <ul class="flex flex-col gap-2">
      <li v-for="line in lines" :key="line.line" class="flex items-start gap-2.5">
        <LineBadge :name="line.line" :mode="line.mode" />
        <div class="min-w-0 text-sm">
          <p>
            {{ t('routes.punctuality.average', Math.round(line.averageDelay / MINUTE)) }}
          </p>
          <p class="text-ink-subtle">
            {{ t('routes.punctuality.late', { late: line.late, count: line.count }) }}
          </p>
          <p v-if="oftenLate(line)" class="flex items-center gap-1.5 font-medium text-soon">
            <IconAlertTriangle aria-hidden="true" class="flex-none" />
            {{ t('routes.punctuality.hint') }}
          </p>
        </div>
      </li>
    </ul>
    <p class="text-xs text-ink-subtle">{{ t('routes.punctuality.note') }}</p>
  </div>
</template>
