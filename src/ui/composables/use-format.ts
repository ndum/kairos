import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { TIME_ZONE } from '@/domain/local-time'
import { type Duration, type Instant, MINUTE } from '@/domain/time'

import { formattingLocale } from '../i18n/locale'

/** Times as 24-hour clock in Swiss time, for example 06:54, and durations in minutes. */
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

  return {
    time: (instant: Instant): string => clock.value.format(instant),
    minutes: (duration: Duration): number => Math.round(duration / MINUTE),
  }
}
