<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import IconRoute from '~icons/tabler/route'

import BaseButton from '../components/BaseButton.vue'
import EmptyState from '../components/EmptyState.vue'
import { useDialog } from '../composables/use-dialog'

const LinkImportDialog = defineAsyncComponent(() => import('../routes/LinkImportDialog.vue'))

const { t } = useI18n()
const linkImport = useDialog()
</script>

<template>
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
