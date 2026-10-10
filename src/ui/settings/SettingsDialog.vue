<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import IconChevronRight from '~icons/tabler/chevron-right'
import IconCloud from '~icons/tabler/cloud'
import IconCode from '~icons/tabler/code'
import IconContrast from '~icons/tabler/contrast'
import IconDeviceMobile from '~icons/tabler/device-mobile'
import IconInfoCircle from '~icons/tabler/info-circle'
import IconMapPin from '~icons/tabler/map-pin'
import IconWaveSine from '~icons/tabler/wave-sine'
import IconWorld from '~icons/tabler/world'

import AppDialog from '../components/AppDialog.vue'
import SettingSelect from '../components/SettingSelect.vue'
import SettingSwitch from '../components/SettingSwitch.vue'
import { useAppearance } from '../composables/use-appearance'
import { useAwakePreference } from '../composables/use-keep-awake'
import { useLanguage } from '../composables/use-language'
import { useLocationPreference } from '../composables/use-location-preference'
import { useWeatherPreference } from '../composables/use-weather-preference'
import { useServices } from '../services'

const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const { theme, reduceMotion } = useAppearance()
const language = useLanguage()
const { location } = useServices()
const useLocation = useLocationPreference()
const keepAwake = useAwakePreference()
const showWeather = useWeatherPreference()
const canKeepAwake = 'wakeLock' in navigator
// The kind of problem, not its text, so the hint follows a change of language.
const locationError = ref<'denied' | 'unavailable'>()
let locationRequest = 0

const VERSION = __APP_VERSION__
const groups = { appearance: useId(), travel: useId(), about: useId() }
const SOURCE = 'https://github.com/ndum/kairos'

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
  locationError.value = result.kind
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
      { value: 'fr', label: 'Français' },
      { value: 'it', label: 'Italiano' },
    ] as const,
)
</script>

<template>
  <AppDialog v-model:open="open" :title="t('settings.title')" placement="side">
    <section class="flex flex-col gap-2.5" :aria-labelledby="groups.appearance">
      <h3 :id="groups.appearance" class="setting-caption">{{ t('settings.groups.appearance') }}</h3>
      <div class="setting-group">
        <SettingSelect
          v-model="theme"
          :label="t('settings.theme.label')"
          :options="themes"
          :icon="IconContrast"
        />
        <SettingSelect
          v-model="language"
          :label="t('settings.language.label')"
          :options="languages"
          :icon="IconWorld"
        />
        <SettingSwitch
          v-model="reduceMotion"
          :label="t('settings.motion.label')"
          :hint="t('settings.motion.hint')"
          :icon="IconWaveSine"
        />
      </div>
    </section>

    <section class="flex flex-col gap-2.5" :aria-labelledby="groups.travel">
      <h3 :id="groups.travel" class="setting-caption">{{ t('settings.groups.travel') }}</h3>
      <div class="setting-group">
        <SettingSwitch
          :model-value="useLocation"
          :label="t('settings.location.label')"
          :hint="t('settings.location.hint')"
          :error="locationError && t(`settings.location.${locationError}`)"
          :icon="IconMapPin"
          :tone="2"
          @update:model-value="setLocation"
        />
        <SettingSwitch
          v-model="showWeather"
          :label="t('settings.weather.label')"
          :hint="t('settings.weather.hint')"
          :icon="IconCloud"
          :tone="2"
        />
        <SettingSwitch
          v-model="keepAwake"
          :label="t('settings.awake.label')"
          :hint="canKeepAwake ? t('settings.awake.hint') : t('settings.awake.unsupported')"
          :disabled="!canKeepAwake"
          :icon="IconDeviceMobile"
          :tone="2"
        />
      </div>
    </section>

    <section class="flex flex-col gap-2.5" :aria-labelledby="groups.about">
      <h3 :id="groups.about" class="setting-caption">{{ t('app.name') }}</h3>
      <div class="setting-group">
        <div class="setting-row cursor-default hover:bg-transparent">
          <span class="setting-tile tone-3" aria-hidden="true"><IconInfoCircle /></span>
          <span class="flex-1 font-medium">{{ t('settings.version') }}</span>
          <span class="text-ink-subtle">{{ VERSION }}</span>
        </div>
        <a class="setting-row" :href="SOURCE" target="_blank" rel="noopener noreferrer">
          <span class="setting-tile tone-3" aria-hidden="true"><IconCode /></span>
          <span class="flex-1 font-medium">{{ t('settings.source') }}</span>
          <IconChevronRight aria-hidden="true" class="flex-none text-ink-subtle" />
        </a>
      </div>
      <p class="mx-1.5 text-sm text-pretty text-ink-subtle">{{ t('settings.privacy') }}</p>
    </section>
  </AppDialog>
</template>
