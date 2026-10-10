<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import AppDialog from '../components/AppDialog.vue'
import BaseButton from '../components/BaseButton.vue'
import TextField from '../components/TextField.vue'
import { shareCodeFrom } from './share-link'

// The installed app on the iPhone keeps its own data apart from Safari, so a shared link
// opened in Safari does not reach it. Pasting the link here does.

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const router = useRouter()

const text = ref('')
const error = ref<string>()

watch(open, (isOpen) => {
  if (!isOpen) return
  text.value = ''
  error.value = undefined
})

function submit(): void {
  const code = shareCodeFrom(text.value)
  if (!code) {
    error.value = t('linkImport.invalid')
    return
  }
  open.value = false
  void router.push({ name: 'import', query: { r: code } })
}
</script>

<template>
  <AppDialog v-model:open="open" :title="t('linkImport.title')">
    <form class="flex flex-col gap-6" novalidate @submit.prevent="submit">
      <p class="text-pretty text-ink-muted">{{ t('linkImport.text') }}</p>
      <TextField
        v-model="text"
        :label="t('linkImport.field')"
        :placeholder="t('linkImport.placeholder')"
        :error="error"
      />
      <BaseButton variant="primary" type="submit" class="self-end">
        {{ t('linkImport.submit') }}
      </BaseButton>
    </form>
  </AppDialog>
</template>
