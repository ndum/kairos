import { describe, expect, it } from 'vitest'

import { recordsOf } from '@/domain/punctuality'
import { morningCommute } from '@/test/builders'
import { MemoryStorage } from '@/test/fakes'

import { LocalStorageDelayStore } from './local-storage-delay-store'

const records = recordsOf('commute', morningCommute('07:05', { delay: 3 }))

describe('LocalStorageDelayStore', () => {
  it('stores, loads and forgets the delays', () => {
    const storage = new MemoryStorage()
    const store = new LocalStorageDelayStore({ storage, events: new EventTarget() })

    store.save(records)
    expect(store.load()).toEqual(records)

    store.save([])
    expect(store.load()).toEqual([])
    expect(storage.items.size).toBe(0)
  })

  it('loads nothing from malformed or outdated entries', () => {
    const storage = new MemoryStorage()
    const store = new LocalStorageDelayStore({ storage, events: new EventTarget() })

    storage.setItem('kairos:delays', '{')
    expect(store.load()).toEqual([])

    storage.setItem('kairos:delays', JSON.stringify({ version: 0, records }))
    expect(store.load()).toEqual([])
  })

  it('works on without storage or when it is blocked', () => {
    expect(new LocalStorageDelayStore(null).load()).toEqual([])

    const blocked = new LocalStorageDelayStore({
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
      blocked.save(records)
    }).not.toThrow()
    expect(blocked.load()).toEqual([])
  })
})
