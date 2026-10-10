import { type ShallowRef, onScopeDispose, ref, shallowRef } from 'vue'

export type SearchStatus = 'idle' | 'searching' | 'done' | 'failed'

export interface SearchOptions {
  /** Shorter texts are not searched. */
  readonly minLength: number
  /** Pause in typing before a search starts, in milliseconds. */
  readonly delay?: number
}

/**
 * Searches while the user types: once typing pauses for the delay, and always for the latest
 * text only.
 */
export function useSearch<T>(
  find: (text: string, signal: AbortSignal) => Promise<readonly T[]>,
  { minLength, delay = 250 }: SearchOptions,
) {
  const results: ShallowRef<readonly T[]> = shallowRef([])
  const status = ref<SearchStatus>('idle')
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | null = null

  async function run(text: string): Promise<void> {
    const current = new AbortController()
    controller = current
    try {
      results.value = await find(text, current.signal)
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
    if (text.trim().length < minLength) {
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
