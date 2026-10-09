<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconAlertTriangle from '~icons/tabler/alert-triangle'

import type { TransferRisk } from '@/domain/transfer'

defineProps<{ risk: Exclude<TransferRisk, 'ok'> }>()

const { t } = useI18n()
</script>

<template>
  <span class="risk" :class="risk">
    <IconAlertTriangle aria-hidden="true" />
    {{ t(`now.risk.${risk}`) }}
  </span>
</template>

<style scoped>
.risk {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  gap: 0.4em;
  border-radius: 9999px;
  padding-inline: 0.85em;
  color: var(--color-ink);
  font-size: 0.875rem;
  font-weight: 650;
}

.risk.tight {
  background: var(--color-soon-soft);
}

.risk.broken {
  background: var(--color-late-soft);
}

.risk svg {
  color: var(--color-late);
}
</style>
