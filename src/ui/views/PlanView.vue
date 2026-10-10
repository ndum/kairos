<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconCalendarTime from '~icons/tabler/calendar-time'

import EmptyState from '../components/EmptyState.vue'

const { t } = useI18n()
</script>

<template>
  <EmptyState
    :icon="IconCalendarTime"
    :title="t('plan.empty.title')"
    :text="t('plan.empty.text')"
    :action="{ label: t('plan.empty.action'), to: { name: 'routes' } }"
  />
</template>
