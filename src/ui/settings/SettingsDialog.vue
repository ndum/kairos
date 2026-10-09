<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppDialog from '../components/AppDialog.vue'
import SegmentedControl from '../components/SegmentedControl.vue'
import { useAppearance } from '../composables/use-appearance'
import { useLanguage } from '../composables/use-language'

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const { theme } = useAppearance()
const language = useLanguage()

const themes = computed(
  () =>
    [
      { value: 'auto', label: t('settings.theme.auto') },
      { value: 'light', label: t('settings.theme.light') },
      { value: 'dark', label: t('settings.theme.dark') },
    ] as const,
)

// Languages are named in their own language, so everyone finds theirs.
const languages = computed(
  () =>
    [
      { value: 'auto', label: t('settings.language.auto') },
      { value: 'de', label: 'Deutsch' },
      { value: 'en', label: 'English' },
    ] as const,
)
</script>

<template>
  <AppDialog v-model:open="open" :title="t('settings.title')">
    <SegmentedControl v-model="theme" :label="t('settings.theme.label')" :options="themes" />
    <SegmentedControl
      v-model="language"
      :label="t('settings.language.label')"
      :options="languages"
    />
  </AppDialog>
</template>
