import { useEventListener, useIntervalFn } from '@vueuse/core'
import { type Ref, computed, onScopeDispose, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import { type Instant, SECOND } from '@/domain/time'

import { useFormat } from '../composables/use-format'
import { useServices } from '../services'
import { useTitleStore } from '../stores/title'
import { type Countdown, countdownTo } from './countdown'

/** Hidden pages run their timers about once a minute at most, which is enough for minutes. */
const BACKGROUND_TICK = 15 * SECOND

/**
 * Puts the time until leaving into the title of the page and on the icon of the installed app,
 * so it stays in sight while Kairos runs behind other windows. The board stands still in the
 * background, so the title keeps its own clock there.
 */
export function useCountdownTitle(leaveAt: Ref<Instant | null>, now: Ref<Instant>): void {
  const { t } = useI18n()
  const format = useFormat()
  const { clock } = useServices()
  const title = useTitleStore()

  const ticked = ref(clock.now())
  useIntervalFn(() => {
    ticked.value = clock.now()
  }, BACKGROUND_TICK)

  const countdown = computed(() =>
    leaveAt.value === null ? null : countdownTo(leaveAt.value, Math.max(now.value, ticked.value)),
  )

  const status = computed(() => {
    const value = countdown.value
    if (value === null) return null
    if (value.kind === 'minutes') return t('now.tab.minutes', { minutes: value.minutes })
    if (value.kind === 'now') return t('now.tab.now')
    return t('now.tab.at', { time: format.time(value.at) })
  })
  watchEffect(() => {
    title.status = status.value
  })

  watch(() => badgeOf(countdown.value), showBadge, { immediate: true })
  // A badge outlives the app, so it goes when the app is closed.
  useEventListener(window, 'pagehide', () => void showBadge(null))

  onScopeDispose(() => {
    title.status = null
    void showBadge(null)
  })
}

/** Minutes on the badge, a plain mark when it is time to go, nothing beyond the countdown. */
function badgeOf(countdown: Countdown | null): number | 'mark' | null {
  if (countdown?.kind === 'minutes') return countdown.minutes
  return countdown?.kind === 'now' ? 'mark' : null
}

async function showBadge(badge: number | 'mark' | null): Promise<void> {
  if (!('setAppBadge' in navigator)) return
  try {
    if (badge === null) await navigator.clearAppBadge()
    else if (badge === 'mark') await navigator.setAppBadge()
    else await navigator.setAppBadge(badge)
  } catch {
    // Safari shows badges only with the permission to notify, which Kairos does not ask for.
  }
}
