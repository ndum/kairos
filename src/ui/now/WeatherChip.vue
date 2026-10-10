<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCloud from '~icons/tabler/cloud'
import IconCloudFog from '~icons/tabler/cloud-fog'
import IconCloudRain from '~icons/tabler/cloud-rain'
import IconCloudSnow from '~icons/tabler/cloud-snow'
import IconCloudStorm from '~icons/tabler/cloud-storm'
import IconMoon from '~icons/tabler/moon'
import IconSun from '~icons/tabler/sun'

import type { WeatherStep } from '@/domain/weather'

const props = defineProps<{ step: WeatherStep }>()

const { t } = useI18n()

const icon = computed(() => {
  switch (props.step.sky) {
    case 'clear':
      return props.step.isDay ? IconSun : IconMoon
    case 'fog':
      return IconCloudFog
    case 'drizzle':
    case 'rain':
      return IconCloudRain
    case 'snow':
      return IconCloudSnow
    case 'thunder':
      return IconCloudStorm
    default:
      return IconCloud
  }
})
const degrees = computed(() => Math.round(props.step.temperature))
</script>

<template>
  <span
    class="weather"
    role="img"
    :aria-label="
      t('now.weather.label', { sky: t(`now.weather.sky.${step.sky}`), temperature: degrees })
    "
  >
    <component :is="icon" aria-hidden="true" />
    <span aria-hidden="true">{{ degrees }}°</span>
  </span>
</template>

<style scoped>
.weather {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 999px;
  padding: 0.25rem 0.625rem;
  background: var(--color-group);
  color: var(--color-ink-muted);
  font-size: 0.875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
