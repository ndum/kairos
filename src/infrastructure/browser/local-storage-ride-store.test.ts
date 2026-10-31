import { describe, expect, it } from 'vitest'

import { rideOf } from '@/application/ride'
import { planTrip } from '@/domain/trip'
import { commute, morningCommute, route } from '@/test/builders'
import { MemoryStorage } from '@/test/fakes'

import { LocalStorageRideStore } from './local-storage-ride-store'

const trip = planTrip(morningCommute('07:20', { delay: 3, platform: '2' }), commute)
if (!trip) throw new Error('Expected a trip')
const ride = rideOf(route('commute'), 'return', trip)

describe('LocalStorageRideStore', () => {
  it('stores, loads and forgets the ride', () => {
    const storage = new MemoryStorage()
    const store = new LocalStorageRideStore({ storage, events: new EventTarget() })

    store.save(ride)
    expect(store.load()).toEqual(JSON.parse(JSON.stringify(ride)))

    store.save(null)
    expect(store.load()).toBeNull()
    expect(storage.items.size).toBe(0)
  })

  it('loads nothing from malformed or outdated entries', () => {
    const storage = new MemoryStorage()
    const store = new LocalStorageRideStore({ storage, events: new EventTarget() })

    storage.setItem('kairos:ride', '{')
    expect(store.load()).toBeNull()

    storage.setItem('kairos:ride', JSON.stringify({ version: 0, ride }))
    expect(store.load()).toBeNull()
  })

  it('works on without storage', () => {
    const store = new LocalStorageRideStore(null)

    store.save(ride)
    expect(store.load()).toBeNull()
  })

  it('ignores storage that is full or blocked', () => {
    const store = new LocalStorageRideStore({
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
      store.save(ride)
    }).not.toThrow()
    expect(store.load()).toBeNull()
  })
})
