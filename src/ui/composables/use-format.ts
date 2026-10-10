import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { TIME_ZONE } from '@/domain/local-time'
import { type Duration, type Instant, MINUTE } from '@/domain/time'

import { formattingLocale } from '../i18n/locale'

/** Times as 24-hour clock in Swiss time, for example 06:54, durations in minutes and distances. */
export function useFormat() {
  const { locale } = useI18n()
  const clock = computed(
    () =>
      new Intl.DateTimeFormat(formattingLocale(locale.value), {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: TIME_ZONE,
      }),
  )

  const length = (unit: 'meter' | 'kilometer', digits: number) =>
    new Intl.NumberFormat(formattingLocale(locale.value), {
      style: 'unit',
      unit,
      maximumFractionDigits: digits,
    })

  return {
    time: (instant: Instant): string => clock.value.format(instant),
    minutes: (duration: Duration): number => Math.round(duration / MINUTE),
    /** Names joined like in a sentence: S3 und 1. */
    list: (names: readonly string[]): string =>
      new Intl.ListFormat(formattingLocale(locale.value), { type: 'conjunction' }).format(names),
    /** Short distances to the ten meters, longer ones in kilometers: 120 m, 1.2 km. */
    distance: (meters: number): string =>
      meters < 1000
        ? length('meter', 0).format(Math.round(meters / 10) * 10)
        : length('kilometer', 1).format(meters / 1000),
  }
}
