import { describe, expect, it, vi } from 'vitest'

import { minutes } from '@/domain/time'
import { busLine, gym, home, office, route, trainLine } from '@/test/builders'
import { MemoryRouteRepository } from '@/test/fakes'

import { InvalidRouteError, type RouteDraft, RouteLibrary } from './route-library'

const commute = route('commute', 'Commute', [home, office], [trainLine('S1'), busLine('20')])
const training = route('training', 'Training', [home, gym])
const evening = route('evening', 'Evening', [office, gym])

const draft: RouteDraft = {
  name: ' Commute ',
  places: [
    { ...home, name: ' Home ' },
    { ...office, name: 'Office' },
  ],
  buffer: minutes(3),
  preferredLines: [trainLine('S1'), trainLine('s1'), busLine(' 20 ')],
}

function setup(stored: ReturnType<typeof route>[] = [], ids = ['first', 'second', 'third']) {
  const repository = new MemoryRouteRepository(stored)
  const createId = vi.fn(() => ids.shift() ?? 'exhausted')
  const library = new RouteLibrary({ repository, createId })
  return { library, repository, createId }
}

const idsOf = (library: RouteLibrary): string[] => library.snapshot.routes.map(({ id }) => id)

describe('RouteLibrary', () => {
  it('starts with the stored routes and leaves out invalid ones', () => {
    const broken = route('broken', '')
    const { library } = setup([commute, broken, training])

    expect(idsOf(library)).toEqual(['commute', 'training'])
    expect(library.snapshot.saved).toBe(true)
  })

  it('adds a route with a new id and tidied names and lines', () => {
    const { library, repository } = setup([commute], ['fresh'])

    const added = library.add({ ...draft, places: [office, gym] })

    expect(added).toMatchObject({
      id: 'fresh',
      name: 'Commute',
      preferredLines: [trainLine('S1'), busLine('20')],
    })
    expect(idsOf(library)).toEqual(['commute', 'fresh'])
    expect(repository.routes).toEqual(library.snapshot.routes)
  })

  it('trims the names of the places', () => {
    const { library } = setup()

    const added = library.add(draft)

    expect(added.places.map((place) => place.name)).toEqual(['Home', 'Office'])
  })

  it('creates another id when the generated one is taken', () => {
    const { library, createId } = setup([commute], ['commute', 'unique'])

    expect(library.add(draft).id).toBe('unique')
    expect(createId).toHaveBeenCalledTimes(2)
  })

  it('rejects an invalid route', () => {
    const { library, repository } = setup()

    expect(() => library.add({ ...draft, places: [home, home] })).toThrow(InvalidRouteError)
    expect(() => library.add({ ...draft, buffer: minutes(31) })).toThrow(InvalidRouteError)
    expect(() => {
      library.update({ ...commute, name: '' })
    }).toThrow(InvalidRouteError)
    expect(repository.routes).toEqual([])
  })

  it('finds a route by its id', () => {
    const { library } = setup([commute, training])

    expect(library.find('training')).toEqual(training)
    expect(library.find('unknown')).toBeUndefined()
  })

  it('updates a route in place', () => {
    const { library } = setup([commute, training])

    library.update({ ...commute, name: 'Work', preferredLines: [trainLine(' S2 ')] })

    expect(library.snapshot.routes).toEqual([
      { ...commute, name: 'Work', preferredLines: [trainLine('S2')] },
      training,
    ])
  })

  it('adds an updated route again when another tab has removed it meanwhile', () => {
    const { library } = setup([training])

    library.update(commute)

    expect(idsOf(library)).toEqual(['training', 'commute'])
  })

  it('removes a route and restores it at its former position', () => {
    const { library } = setup([commute, training, evening])

    const removed = library.remove('training')
    expect(removed).toEqual({ route: training, index: 1 })
    expect(idsOf(library)).toEqual(['commute', 'evening'])

    library.restore({ route: training, index: 1 })
    expect(idsOf(library)).toEqual(['commute', 'training', 'evening'])
  })

  it('ignores unknown routes and repeated restores', () => {
    const { library } = setup([commute, training])

    expect(library.remove('unknown')).toBeNull()
    library.remove('commute')
    library.restore({ route: commute, index: 0 })
    library.restore({ route: commute, index: 0 })

    expect(idsOf(library)).toEqual(['commute', 'training'])
  })

  it('moves a route up and down, but not beyond the ends of the list', () => {
    const { library } = setup([commute, training, evening])

    library.move('evening', -1)
    expect(idsOf(library)).toEqual(['commute', 'evening', 'training'])

    library.move('commute', -1)
    library.move('training', 5)
    library.move('unknown', 1)
    expect(idsOf(library)).toEqual(['commute', 'evening', 'training'])
  })

  it('merges shared routes, adding new ones and replacing the ones with the same id', () => {
    const { library, repository } = setup([commute, training])
    const renamed = { ...training, name: 'Gym' }

    const result = library.merge([renamed, evening, route('broken', '')])

    expect(result).toEqual({ added: 1, updated: 1 })
    expect(repository.routes).toEqual([commute, renamed, evening])
  })

  it('forgets the position of a place whose stop changes', () => {
    const position = { latitude: 47.4845, longitude: 7.7314 }
    const located = route('training', 'Training', [{ ...home, coordinates: position }, gym])
    const { library } = setup([located])

    library.merge([route('training', 'Training', [{ ...home, stop: office.stop }, gym])])

    expect(library.find('training')?.places[0]).not.toHaveProperty('coordinates')
  })

  it('keeps the position of a place whose stop stays the same', () => {
    const position = { latitude: 47.4845, longitude: 7.7314 }
    const located = route('training', 'Training', [{ ...home, coordinates: position }, gym])
    const { library } = setup([located])

    library.merge([{ ...training, name: 'Gym' }])

    expect(library.find('training')?.places[0].coordinates).toEqual(position)
  })

  it('notifies listeners about changes until they unsubscribe', () => {
    const { library } = setup([commute])
    const listener = vi.fn()

    const unsubscribe = library.subscribe(listener)
    library.remove('commute')
    unsubscribe()
    library.add(draft)

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({ routes: [], saved: true })
  })

  it('keeps changes for the session when they cannot be saved', () => {
    const { library, repository } = setup([commute])
    repository.failing = true

    library.remove('commute')
    expect(library.snapshot).toEqual({ routes: [], saved: false })

    repository.failing = false
    library.add(draft)
    expect(library.snapshot.saved).toBe(true)
    expect(repository.routes).toHaveLength(1)
  })

  it('takes over routes saved in another tab', () => {
    const { library, repository } = setup([commute])
    const listener = vi.fn()
    library.subscribe(listener)

    repository.saveFromElsewhere([training, route('broken', '')])

    expect(library.snapshot.routes).toEqual([training])
    expect(listener).toHaveBeenCalledWith({ routes: [training], saved: true })
  })

  it('stops listening to other tabs once disposed', () => {
    const { library, repository } = setup()

    library.dispose()

    expect(repository.listeners).toBe(0)
  })
})
