import { useStorage } from '@vueuse/core'
import { type Ref, computed, ref } from 'vue'

import { chooseDirection } from '@/domain/direction'
import type { Coordinates } from '@/domain/geo'
import { toLocal } from '@/domain/local-time'
import { type Direction, type Route, oppositeDirection } from '@/domain/route'
import type { Instant } from '@/domain/time'

/** The route shown last is kept per device, it is not part of shared links. */
export const SELECTED_ROUTE_KEY = 'kairos:route'

/**
 * The route on the board and its direction. The direction follows the position of the device
 * if allowed, or else the time of day, until the user swaps it. A swap holds for that route
 * until another one is chosen.
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

  const direction = computed<Direction>(() => {
    const current = route.value
    if (!current) return 'outbound'
    if (swapped.value?.routeId === current.id) return swapped.value.direction
    const { minuteOfDay } = toLocal(now.value)
    return chooseDirection(current, {
      minuteOfDay,
      ...(location.value && { location: location.value }),
    })
  })

  function select(id: string): void {
    selectedId.value = id
    swapped.value = null
  }

  function swap(): void {
    const current = route.value
    if (!current) return
    swapped.value = { routeId: current.id, direction: oppositeDirection(direction.value) }
  }

  return { route, direction, select, swap }
}
