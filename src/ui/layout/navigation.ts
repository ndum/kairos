import type { Component } from 'vue'
import IconCalendarTime from '~icons/tabler/calendar-time'
import IconClock from '~icons/tabler/clock-hour-4'
import IconRoute from '~icons/tabler/route'

export type NavigationSection = 'now' | 'plan' | 'routes'

export interface NavigationItem {
  readonly name: NavigationSection
  readonly icon: Component
}

export const NAVIGATION: readonly NavigationItem[] = [
  { name: 'now', icon: IconClock },
  { name: 'plan', icon: IconCalendarTime },
  { name: 'routes', icon: IconRoute },
]
