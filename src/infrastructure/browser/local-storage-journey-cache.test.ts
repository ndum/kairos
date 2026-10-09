import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CachedJourneys } from '@/application/ports/journey-cache'
import { at, journey, morningCommute, ride } from '@/test/builders'
import { MemoryStorage, storageEvent } from '@/test/fakes'

import { LocalStorageJourneyCache } from './local-storage-journey-cache'
import type { StorageEnvironment } from './storage-environment'

const entry: CachedJourneys = {
  journeys: [
    morningCommute('07:05', { delay: 2, platform: '2' }),
    journey(ride('S2', 'Central', '16:50', 'Riverside', '16:59', { cancelled: true })),
  ],
  fetchedAt: at('06:40'),
}

describe('LocalStorageJourneyCache', () => {
  let storage: MemoryStorage
  let events: EventTarget
  let cache: LocalStorageJourneyCache

  beforeEach(() => {
    storage = new MemoryStorage()
    events = new EventTarget()
    cache = new LocalStorageJourneyCache({ storage, events } satisfies StorageEnvironment)
  })

  it('stores and restores journeys', () => {
    cache.write('a>b', entry)

    expect(cache.read('a>b')).toEqual(JSON.parse(JSON.stringify(entry)))
  })

  it('returns nothing for unknown, malformed or outdated entries', () => {
    storage.setItem('kairos:journeys:broken', '{')
    storage.setItem('kairos:journeys:other', JSON.stringify({ journeys: 'none', fetchedAt: 1 }))
    storage.setItem(
      'kairos:journeys:old',
      JSON.stringify({ version: 0, journeys: [], fetchedAt: at('06:40') }),
    )

    expect(cache.read('missing')).toBeNull()
    expect(cache.read('broken')).toBeNull()
    expect(cache.read('other')).toBeNull()
    expect(cache.read('old')).toBeNull()
  })

  it('keeps working when the storage is full or blocked', () => {
    const blocked = new LocalStorageJourneyCache({
      storage: {
        getItem: () => {
          throw new DOMException('Blocked', 'SecurityError')
        },
        setItem: () => {
          throw new DOMException('Full', 'QuotaExceededError')
        },
      },
      events,
    })

    expect(() => {
      blocked.write('a>b', entry)
    }).not.toThrow()
    expect(blocked.read('a>b')).toBeNull()
  })

  it('reports entries written by other tabs', () => {
    const listener = vi.fn()
    const unsubscribe = cache.subscribe(listener)
    const value = JSON.stringify({ version: 1, ...entry })

    events.dispatchEvent(storageEvent('kairos:journeys:a>b', value))
    events.dispatchEvent(storageEvent('unrelated', value))
    events.dispatchEvent(storageEvent('kairos:journeys:a>b', 'not json'))
    unsubscribe()
    events.dispatchEvent(storageEvent('kairos:journeys:a>b', value))

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith('a>b', JSON.parse(JSON.stringify(entry)))
  })

  it('does nothing without browser storage', () => {
    const detached = new LocalStorageJourneyCache(null)

    detached.write('a>b', entry)
    expect(detached.read('a>b')).toBeNull()
    expect(() => {
      detached.subscribe(vi.fn())()
    }).not.toThrow()
  })
})
