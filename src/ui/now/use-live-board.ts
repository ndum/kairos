import { useDocumentVisibility } from '@vueuse/core'
import { type Ref, computed, onScopeDispose, shallowRef, watch } from 'vue'

import { buildBoard, nextLeaveAt } from '@/application/board'
import type { MonitorSnapshot } from '@/application/trip-monitor'
import { type Direction, type Route, endpoints } from '@/domain/route'
import type { Instant } from '@/domain/time'

import { useServices } from '../services'

/**
 * The board for one direction of a route, kept up to date by a trip monitor. Refreshing
 * pauses while the page is hidden and catches up when it shows again.
 */
export function useLiveBoard(route: Ref<Route>, direction: Ref<Direction>, now: Ref<Instant>) {
  const monitor = useServices().createTripMonitor()
  const snapshot = shallowRef<MonitorSnapshot>(monitor.snapshot)
  const unsubscribe = monitor.subscribe((next) => {
    snapshot.value = next
  })

  const ends = computed(() => endpoints(route.value, direction.value))
  const lines = computed(() => route.value.preferredLines.map((line) => line.name))

  watch(
    ends,
    ({ origin, destination }) => {
      monitor.watch({
        from: origin.stop,
        to: destination.stop,
        nextLeaveAt: (journeys, at) =>
          nextLeaveAt(buildBoard(journeys, { origin, destination }, lines.value, at)),
      })
    },
    { immediate: true },
  )

  const visibility = useDocumentVisibility()
  watch(visibility, (state) => {
    if (state === 'hidden') monitor.pause()
    else monitor.resume()
  })

  onScopeDispose(() => {
    unsubscribe()
    monitor.dispose()
  })

  return {
    endpoints: ends,
    snapshot,
    board: computed(() => buildBoard(snapshot.value.journeys, ends.value, lines.value, now.value)),
    refresh: (): void => {
      void monitor.refresh({ force: true })
    },
  }
}
