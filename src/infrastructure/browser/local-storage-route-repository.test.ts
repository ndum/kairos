import { beforeEach, describe, expect, it, vi } from 'vitest'

import { minutes } from '@/domain/time'
import { busLine, gym, home, office, route, trainLine } from '@/test/builders'
import { MemoryStorage, storageEvent } from '@/test/fakes'

import { LocalStorageRouteRepository } from './local-storage-route-repository'

const commute = route('commute', 'Commute', [home, office], [trainLine('S1'), busLine('20')])
const training = route('training', 'Training', [
  { ...home, coordinates: { latitude: 46.8, longitude: 7.5 } },
  gym,
])

describe('LocalStorageRouteRepository', () => {
  let storage: MemoryStorage
  let events: EventTarget
  let repository: LocalStorageRouteRepository

  beforeEach(() => {
    storage = new MemoryStorage()
    events = new EventTarget()
    repository = new LocalStorageRouteRepository({ storage, events })
  })

  it('stores and loads routes', () => {
    repository.save([commute, training])

    expect(repository.load()).toEqual([commute, training])
  })

  it('starts without routes when nothing usable is stored', () => {
    expect(repository.load()).toEqual([])

    storage.setItem('kairos:routes', '{')
    expect(repository.load()).toEqual([])

    storage.setItem('kairos:routes', JSON.stringify({ version: 0, routes: [commute] }))
    expect(repository.load()).toEqual([])

    storage.setItem('kairos:routes', JSON.stringify({ version: 2, routes: [{ id: 'x' }] }))
    expect(repository.load()).toEqual([])
  })

  it('moves the reserves of routes stored by version 1 to the buffer of the route', () => {
    const stored = {
      ...commute,
      places: [
        { ...home, reserve: minutes(2) },
        { ...office, reserve: minutes(4) },
      ],
      buffer: undefined,
    }
    storage.setItem('kairos:routes', JSON.stringify({ version: 1, routes: [stored] }))

    expect(repository.load()).toEqual([{ ...commute, buffer: minutes(4) }])
  })

  it('stores routes in the current version', () => {
    repository.save([commute])

    expect(JSON.parse(storage.getItem('kairos:routes') ?? '')).toMatchObject({ version: 2 })
  })

  it('reports when the routes cannot be stored', () => {
    const full = new LocalStorageRouteRepository({
      storage: {
        getItem: () => {
          throw new DOMException('Blocked', 'SecurityError')
        },
        setItem: () => {
          throw new DOMException('Full', 'QuotaExceededError')
        },
        removeItem: () => undefined,
      },
      events,
    })

    expect(full.load()).toEqual([])
    expect(() => {
      full.save([commute])
    }).toThrow('Full')
  })

  it('reports routes saved by other tabs', () => {
    const listener = vi.fn()
    const unsubscribe = repository.subscribe(listener)
    const value = JSON.stringify({ version: 2, routes: [training] })

    events.dispatchEvent(storageEvent('kairos:routes', value))
    events.dispatchEvent(storageEvent('kairos:theme', 'dark'))
    events.dispatchEvent(storageEvent('kairos:routes', null))
    unsubscribe()
    events.dispatchEvent(storageEvent('kairos:routes', value))

    expect(listener.mock.calls).toEqual([[[training]], [[]]])
  })

  it('cannot store anything without browser storage', () => {
    const detached = new LocalStorageRouteRepository(null)

    expect(detached.load()).toEqual([])
    expect(() => {
      detached.save([commute])
    }).toThrow()
    expect(() => {
      detached.subscribe(vi.fn())()
    }).not.toThrow()
  })
})
