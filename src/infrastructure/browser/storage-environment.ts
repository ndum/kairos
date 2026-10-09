import type { Cancel } from '@/application/ports/scheduler'

export interface StorageEnvironment {
  readonly storage: Pick<Storage, 'getItem' | 'setItem'>
  /** Source of the "storage" events that report writes from other tabs. */
  readonly events: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
}

/** Reading localStorage throws when the user blocks site data, so storage stays optional. */
export function browserStorage(): StorageEnvironment | null {
  try {
    return typeof window === 'undefined' ? null : { storage: window.localStorage, events: window }
  } catch {
    return null
  }
}

/** Reports values that other tabs write to the keys accepted by the filter. */
export function watchStorage(
  env: StorageEnvironment | null,
  accepts: (key: string) => boolean,
  listener: (key: string, value: string | null) => void,
): Cancel {
  if (!env) return () => undefined

  const onStorage = (event: Event): void => {
    const { key, newValue } = event as StorageEvent
    if (key !== null && accepts(key)) listener(key, newValue)
  }
  env.events.addEventListener('storage', onStorage)
  return () => {
    env.events.removeEventListener('storage', onStorage)
  }
}
