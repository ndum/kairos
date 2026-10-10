import { onScopeDispose, ref, shallowRef } from 'vue'

import { MIN_QUERY_LENGTH } from '@/application/stop-search'
import type { StopRef } from '@/domain/route'

import { useServices } from '../services'

export type StopSearchStatus = 'idle' | 'searching' | 'done' | 'failed'

/**
 * Searches stops while the user types: once typing pauses for the given delay, and always
 * for the latest text only.
 */
export function useStopSearch(delay = 250) {
  const { stops } = useServices()
  const results = shallowRef<readonly StopRef[]>([])
  const status = ref<StopSearchStatus>('idle')
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | null = null

  async function run(text: string): Promise<void> {
    const current = new AbortController()
    controller = current
    try {
      results.value = await stops.find(text, current.signal)
      status.value = 'done'
    } catch {
      if (current.signal.aborted) return
      results.value = []
      status.value = 'failed'
    }
  }

  function cancel(): void {
    clearTimeout(timer)
    controller?.abort()
    controller = null
  }

  function search(text: string): void {
    cancel()
    if (text.trim().length < MIN_QUERY_LENGTH) {
      results.value = []
      status.value = 'idle'
      return
    }
    status.value = 'searching'
    timer = setTimeout(() => void run(text), delay)
  }

  onScopeDispose(cancel)

  return { results, status, search }
}
