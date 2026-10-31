import { useDocumentVisibility } from '@vueuse/core'
import { type Ref, computed, onScopeDispose, shallowRef, watch } from 'vue'

import { buildBoard } from '@/application/board'
import type { MonitorSnapshot } from '@/application/trip-monitor'
import { type Route, endpoints, stopPairs } from '@/domain/route'
import { nextArrival } from '@/domain/schedule'
import type { Instant } from '@/domain/time'

import { useServices } from '../services'
import { shortestWalk } from './use-live-board'

/**
 * In the evening, the trip of the next school or work day: the latest one that still arrives
 * by the time of the schedule. It is the plain timetable, delays are not known yet.
 */
export function useArrivalPreview(route: Ref<Route>, now: Ref<Instant>) {
  const monitor = useServices().createTripMonitor()
  const snapshot = shallowRef<MonitorSnapshot>(monitor.snapshot)
  const unsubscribe = monitor.subscribe((next) => {
    snapshot.value = next
  })

  const ends = computed(() => endpoints(route.value, 'outbound'))
  const by = computed(() => nextArrival(route.value.schedule, now.value))
  const visibility = useDocumentVisibility()

  watch(
    [by, ends, visibility],
    ([arrival, current, state]) => {
      if (arrival === null || state === 'hidden') {
        monitor.pause()
        return
      }
      monitor.watch({
        pairs: stopPairs(current),
        at: arrival - shortestWalk(current.destination),
        arriveBy: true,
        nextLeaveAt: () => null,
      })
      monitor.resume()
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    unsubscribe()
    monitor.dispose()
  })

  const lines = computed(() => route.value.preferredLines.map((line) => line.name))
  const trip = computed(() => {
    const arrival = by.value
    if (arrival === null) return null
    const target = { kind: 'arrive', by: arrival } as const
    return buildBoard(snapshot.value.journeys, ends.value, lines.value, now.value, target).main
  })

  return { by, trip }
}
