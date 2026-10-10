<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconMapPin from '~icons/tabler/map-pin'

import EmptyState from '../components/EmptyState.vue'

const { t } = useI18n()
</script>

<template>
  <EmptyState :icon="IconMapPin" :title="t('routes.empty.title')" :text="t('routes.empty.text')" />
</template>
