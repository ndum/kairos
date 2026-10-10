import { describe, expect, it } from 'vitest'

import { busLine, gym, home, office, route, trainLine } from '@/test/builders'

import { forSharing, planImport } from './route-sharing'

const position = { latitude: 46.8, longitude: 7.5 }
const commute = route(
  'commute',
  'Commute',
  [{ ...home, coordinates: position }, office],
  [trainLine('S1'), busLine('20')],
)
const training = route('training', 'Training', [home, gym])

describe('forSharing', () => {
  it('leaves out the positions of places, which stay on the device', () => {
    const shared = forSharing(commute)

    expect(shared.places[0]).not.toHaveProperty('coordinates')
    expect(shared.places[0].stop).toEqual(home.stop)
    expect(shared).toEqual(route('commute', 'Commute', [home, office], commute.preferredLines))
  })
})

describe('planImport', () => {
  it('tells new, changed and unchanged routes apart', () => {
    const renamed = { ...training, name: 'Gym' }
    const evening = route('evening', 'Evening', [office, gym])

    expect(planImport([commute, training], [forSharing(commute), renamed, evening])).toEqual([
      { route: forSharing(commute), status: 'unchanged' },
      { route: renamed, status: 'changed' },
      { route: evening, status: 'new' },
    ])
  })

  it('marks routes that break the rules', () => {
    const broken = route('broken', '', [home, office])

    expect(planImport([], [broken])).toEqual([{ route: broken, status: 'invalid' }])
  })

  it('counts other walking times, buffers, stops and lines as changes', () => {
    const changes = [
      { ...training, places: [{ ...home, walk: home.walk + 60_000 }, gym] as const },
      { ...training, buffer: training.buffer + 60_000 },
      { ...training, places: [home, { ...gym, stop: office.stop }] as const },
      { ...training, preferredLines: [busLine('20')] },
    ]

    for (const changed of changes) {
      expect(planImport([training], [changed])[0]?.status).toBe('changed')
    }
  })
})
