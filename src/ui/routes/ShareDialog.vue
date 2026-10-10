<script setup lang="ts">
import { ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import IconCheck from '~icons/tabler/check'
import IconCopy from '~icons/tabler/copy'
import IconShare from '~icons/tabler/share-2'

import { forSharing } from '@/application/route-sharing'
import type { Route } from '@/domain/route'

import AppDialog from '../components/AppDialog.vue'
import BaseButton from '../components/BaseButton.vue'
import QrCode from '../components/QrCode.vue'
import { useServices } from '../services'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{ routes: readonly Route[] }>()

const { t } = useI18n()
const router = useRouter()
const { codec } = useServices()
const linkId = useId()
const field = useTemplateRef<HTMLInputElement>('field')

const link = ref<string | null>(null)
const copied = ref<'yes' | 'failed' | null>(null)
const canShare = typeof navigator.share === 'function'

watch(
  [open, () => props.routes],
  async ([isOpen, routes]) => {
    if (!isOpen) return
    copied.value = null
    const code = await codec.encode(routes.map(forSharing))
    const { href } = router.resolve({ name: 'import', query: { r: code } })
    link.value = new URL(href, window.location.href).href
  },
  { immediate: true },
)

async function copy(): Promise<void> {
  if (!link.value) return
  try {
    await navigator.clipboard.writeText(link.value)
    copied.value = 'yes'
  } catch {
    copied.value = 'failed'
    field.value?.select()
  }
}

async function share(): Promise<void> {
  if (!link.value) return
  try {
    await navigator.share({ title: t('share.shareTitle'), url: link.value })
  } catch {
    // The user closed the share sheet without choosing a target.
  }
}
</script>

<template>
  <AppDialog v-model:open="open" :title="t('share.title')">
    <p class="text-pretty text-ink-muted">{{ t('share.text', routes.length) }}</p>

    <div class="mx-auto w-full max-w-60">
      <QrCode v-if="link" :value="link" :label="t('share.qrLabel')" />
    </div>

    <div class="flex flex-col gap-2">
      <label :for="linkId" class="font-semibold">{{ t('share.link') }}</label>
      <input
        :id="linkId"
        ref="field"
        :value="link ?? ''"
        readonly
        class="field text-sm"
        @focus="field?.select()"
      />
    </div>

    <div class="flex flex-wrap gap-2">
      <BaseButton variant="primary" :disabled="!link" @click="copy">
        <IconCheck v-if="copied === 'yes'" aria-hidden="true" />
        <IconCopy v-else aria-hidden="true" />
        {{ copied === 'yes' ? t('share.copied') : t('share.copy') }}
      </BaseButton>
      <BaseButton v-if="canShare" :disabled="!link" @click="share">
        <IconShare aria-hidden="true" />
        {{ t('share.share') }}
      </BaseButton>
    </div>
    <p role="status" class="text-sm" :class="{ 'sr-only': copied !== 'failed' }">
      {{ copied === 'failed' ? t('share.copyFailed') : copied === 'yes' ? t('share.copied') : '' }}
    </p>

    <p class="text-sm text-pretty text-ink-subtle">{{ t('share.hint') }}</p>
  </AppDialog>
</template>
