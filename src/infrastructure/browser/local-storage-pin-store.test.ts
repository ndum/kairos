import { describe, expect, it } from 'vitest'

import { pinTrip } from '@/application/pinned-trip'
import { planTrip } from '@/domain/trip'
import { home, morningCommute, office, route } from '@/test/builders'
import { MemoryStorage } from '@/test/fakes'

import { LocalStoragePinStore } from './local-storage-pin-store'

const trip = planTrip(morningCommute('07:20', { delay: 3, platform: '2' }), home, office)
if (!trip) throw new Error('Expected a trip')
const pinned = pinTrip(route('commute'), 'return', trip)

describe('LocalStoragePinStore', () => {
  it('stores, loads and forgets the pinned trip', () => {
    const storage = new MemoryStorage()
    const store = new LocalStoragePinStore({ storage, events: new EventTarget() })

    store.save(pinned)
    expect(store.load()).toEqual(JSON.parse(JSON.stringify(pinned)))

    store.save(null)
    expect(store.load()).toBeNull()
    expect(storage.items.size).toBe(0)
  })

  it('loads nothing from malformed or outdated entries', () => {
    const storage = new MemoryStorage()
    const store = new LocalStoragePinStore({ storage, events: new EventTarget() })

    storage.setItem('kairos:pinned', '{')
    expect(store.load()).toBeNull()

    storage.setItem('kairos:pinned', JSON.stringify({ version: 0, pinned }))
    expect(store.load()).toBeNull()
  })

  it('works on without storage', () => {
    const store = new LocalStoragePinStore(null)

    store.save(pinned)
    expect(store.load()).toBeNull()
  })

  it('ignores storage that is full or blocked', () => {
    const store = new LocalStoragePinStore({
      storage: {
        getItem: () => {
          throw new DOMException('Blocked', 'SecurityError')
        },
        setItem: () => {
          throw new DOMException('Full', 'QuotaExceededError')
        },
        removeItem: () => undefined,
      },
      events: new EventTarget(),
    })

    expect(() => {
      store.save(pinned)
    }).not.toThrow()
    expect(store.load()).toBeNull()
  })
})
