<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconRoute from '~icons/tabler/route'

import EmptyState from '../components/EmptyState.vue'

const { t } = useI18n()
</script>

<template>
  <EmptyState
    :icon="IconRoute"
    :title="t('now.empty.title')"
    :text="t('now.empty.text')"
    :action="{ label: t('now.empty.action'), to: { name: 'routes' } }"
  />
</template>
