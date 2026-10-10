<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AppDialog from '../components/AppDialog.vue'
import SegmentedControl from '../components/SegmentedControl.vue'
import SettingSwitch from '../components/SettingSwitch.vue'
import { useAppearance } from '../composables/use-appearance'
import { useAwakePreference } from '../composables/use-keep-awake'
import { useLanguage } from '../composables/use-language'
import { useLocationPreference } from '../composables/use-location-preference'
import { useServices } from '../services'

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const { theme, reduceMotion } = useAppearance()
const language = useLanguage()
const { location } = useServices()
const useLocation = useLocationPreference()
const keepAwake = useAwakePreference()
const canKeepAwake = 'wakeLock' in navigator
const locationError = ref<string>()
let locationRequest = 0

/**
 * Asks for the position right away, so the browser asks for permission in context. Only a
 * refusal switches the setting off again: a position not found now may well be found later.
 */
async function setLocation(enabled: boolean): Promise<void> {
  const request = ++locationRequest
  locationError.value = undefined
  useLocation.value = enabled
  if (!enabled) return
  const result = await location.current()
  // The user may have switched again while the browser was still looking.
  if (request !== locationRequest || result.kind === 'found') return
  if (result.kind === 'denied') useLocation.value = false
  locationError.value = t(`settings.location.${result.kind}`)
}

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
    <SettingSwitch
      :model-value="useLocation"
      :label="t('settings.location.label')"
      :hint="t('settings.location.hint')"
      :error="locationError"
      @update:model-value="setLocation"
    />
    <SettingSwitch
      v-model="reduceMotion"
      :label="t('settings.motion.label')"
      :hint="t('settings.motion.hint')"
    />
    <SettingSwitch
      v-model="keepAwake"
      :label="t('settings.awake.label')"
      :hint="canKeepAwake ? t('settings.awake.hint') : t('settings.awake.unsupported')"
      :disabled="!canKeepAwake"
    />
  </AppDialog>
</template>
