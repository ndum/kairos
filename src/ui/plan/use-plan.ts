import { type Ref, onScopeDispose, ref, shallowRef, watch } from 'vue'

import { type Plan, type PlanRequest, planTrips } from '@/application/planning'
import { type Direction, type Route, endpoints } from '@/domain/route'
import type { Duration } from '@/domain/time'

import { useServices } from '../services'

export interface PlanInput {
  readonly route: Route
  readonly direction: Direction
  readonly request: PlanRequest
}

/**
 * Plans trips whenever the input changes. Changes in quick succession, such as turning the
 * wheels of a time picker, lead to one request for the last of them.
 */
export function usePlan(input: Ref<PlanInput | null>, delay: Duration = 300) {
  const { timetable } = useServices()
  const plan = shallowRef<Plan | null>(null)
  const status = ref<'loading' | 'done' | 'failed'>('loading')
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | null = null

  async function run(): Promise<void> {
    clearTimeout(timer)
    controller?.abort()
    const current = input.value
    if (!current) return

    const request = new AbortController()
    controller = request
    status.value = 'loading'
    try {
      plan.value = await planTrips(
        timetable,
        endpoints(current.route, current.direction),
        current.route.preferredLines.map((line) => line.name),
        current.request,
        request.signal,
      )
      status.value = 'done'
    } catch {
      if (!request.signal.aborted) status.value = 'failed'
    }
  }

  watch(input, () => {
    clearTimeout(timer)
    timer = setTimeout(() => void run(), delay)
  })
  void run()

  onScopeDispose(() => {
    clearTimeout(timer)
    controller?.abort()
  })

  return { plan, status, retry: run }
}
