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
const locating = ref(false)
const locationError = ref<string>()

/** Asks for the position right away, so the browser asks for permission in context. */
async function setLocation(enabled: boolean): Promise<void> {
  locationError.value = undefined
  if (!enabled) {
    useLocation.value = false
    return
  }
  locating.value = true
  const result = await location.current()
  locating.value = false
  useLocation.value = result.kind === 'found'
  if (result.kind !== 'found') locationError.value = t(`settings.location.${result.kind}`)
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
      :disabled="locating"
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
