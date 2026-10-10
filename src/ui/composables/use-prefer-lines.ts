import { useI18n } from 'vue-i18n'

import type { Route } from '@/domain/route'
import type { Trip } from '@/domain/trip'
import { linesOfJourney, prefersVariant } from '@/domain/variants'

import { useRouteStore } from '../stores/routes'
import { useToastStore } from '../stores/toasts'
import { useFormat } from './use-format'

/** Lets a route take over the lines of a trip, so the app recommends trips like it. */
export function usePreferLines() {
  const { t } = useI18n()
  const routes = useRouteStore()
  const toasts = useToastStore()
  const format = useFormat()

  /** True when the route already prefers exactly the lines of the trip. */
  const prefers = (route: Route, trip: Trip): boolean =>
    prefersVariant(route.preferredLines, { lines: linesOfJourney(trip.journey) })

  function prefer(route: Route, trip: Trip): void {
    const lines = linesOfJourney(trip.journey)
    routes.update({ ...route, preferredLines: lines })
    const names = format.list(lines.map((line) => line.name))
    toasts.show(t('plan.preferredToast', { route: route.name, lines: names }))
  }

  return { prefers, prefer }
}
