import { useStorage } from '@vueuse/core'
import { type Ref, computed, ref } from 'vue'

import { type DirectionChoice, chooseDirection } from '@/domain/direction'
import type { Coordinates } from '@/domain/geo'
import { toLocal } from '@/domain/local-time'
import { type Direction, type Route, oppositeDirection } from '@/domain/route'
import { scheduleDayAt } from '@/domain/schedule'
import type { Instant } from '@/domain/time'

/** The route shown last is kept per device, it is not part of shared links. */
export const SELECTED_ROUTE_KEY = 'kairos:route'

/** What decided the direction on the board: the position, the time of day or the user. */
export type DirectionBasis = DirectionChoice['basis'] | 'swapped'

/**
 * The route on the board and its direction. The direction follows the position of the device
 * if allowed, or else the schedule of the route and the time of day, until the user swaps it.
 * A swap holds for that route until another one is chosen.
 */
export function useRouteChoice(
  routes: Ref<readonly Route[]>,
  now: Ref<Instant>,
  location: Ref<Coordinates | null> = ref(null),
) {
  const selectedId = useStorage<string>(SELECTED_ROUTE_KEY, '')
  const swapped = ref<{ routeId: string; direction: Direction } | null>(null)

  const route = computed(
    () => routes.value.find(({ id }) => id === selectedId.value) ?? routes.value[0] ?? null,
  )

  const choice = computed<{ direction: Direction; basis: DirectionBasis }>(() => {
    const current = route.value
    if (!current) return { direction: 'outbound', basis: 'time' }
    if (swapped.value?.routeId === current.id) {
      return { direction: swapped.value.direction, basis: 'swapped' }
    }
    const { minuteOfDay } = toLocal(now.value)
    return chooseDirection(current, {
      minuteOfDay,
      schedule: scheduleDayAt(current.schedule, now.value),
      ...(location.value && { location: location.value }),
    })
  })
  const direction = computed(() => choice.value.direction)
  const basis = computed(() => choice.value.basis)

  function select(id: string): void {
    selectedId.value = id
    swapped.value = null
  }

  function swap(): void {
    const current = route.value
    if (!current) return
    swapped.value = { routeId: current.id, direction: oppositeDirection(direction.value) }
  }

  return { route, direction, basis, select, swap }
}
