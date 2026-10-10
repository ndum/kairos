import { useDocumentVisibility } from '@vueuse/core'
import { type Ref, computed, onScopeDispose, ref, shallowRef, watch } from 'vue'

import { buildBoard, nextLeaveAt } from '@/application/board'
import type { MonitorSnapshot, MonitorTarget } from '@/application/trip-monitor'
import {
  type Direction,
  type Endpoints,
  type Place,
  type Route,
  endpoints,
  stopPairs,
  stopsOf,
} from '@/domain/route'
import { type ScheduleTarget, scheduleTarget } from '@/domain/schedule'
import type { Duration, Instant } from '@/domain/time'

import { useServices } from '../services'

/**
 * Which journeys to ask for: those arriving by the time of the schedule, those leaving after
 * the time of the way back, or the next ones. A user who can no longer arrive in time gets the
 * next ones again.
 */
function windowOf(
  target: ScheduleTarget | null,
  ends: Endpoints,
  late: boolean,
): Pick<MonitorTarget, 'at' | 'arriveBy'> {
  if (target?.kind === 'arrive' && !late) {
    return { at: target.by - shortestWalk(ends.destination), arriveBy: true }
  }
  if (target?.kind === 'return') return { at: target.from + shortestWalk(ends.origin) }
  return {}
}

/** One time is asked for all stops of a place, so the shortest walk leaves none out. */
const shortestWalk = (place: Place): Duration => Math.min(...stopsOf(place).map(({ walk }) => walk))

const keyOf = (target: ScheduleTarget | null): string => {
  if (target === null) return ''
  return target.kind === 'arrive' ? `arrive@${target.by}` : `return@${target.from}`
}

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
  const target = computed(() => scheduleTarget(route.value.schedule, direction.value, now.value))
  // Changes when the time of the schedule does, not with every tick of the clock.
  const targetKey = computed(() => keyOf(target.value))
  const late = ref(false)
  watch(targetKey, () => {
    late.value = false
  })

  watch(
    [ends, targetKey, late],
    () => {
      const current = ends.value
      const goal = target.value
      monitor.watch({
        pairs: stopPairs(current),
        nextLeaveAt: (journeys, at) =>
          nextLeaveAt(buildBoard(journeys, current, lines.value, at, goal)),
        ...windowOf(goal, current, late.value),
      })
    },
    { immediate: true },
  )

  const board = computed(() =>
    buildBoard(snapshot.value.journeys, ends.value, lines.value, now.value, target.value),
  )
  watch(
    () => board.value.late,
    (isLate) => {
      if (isLate) late.value = true
    },
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
    board,
    refresh: (): void => {
      void monitor.refresh({ force: true })
    },
  }
}
