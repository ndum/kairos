import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { TimetableError } from '@/application/ports/timetable'
import type { RideLeg } from '@/domain/journey'
import { minutes } from '@/domain/time'

import fixture from './fixtures/connections.json'
import { toJourney, toLine, toStop } from './mapping'
import { type ApiSection, ConnectionsResponseSchema } from './schema'

const { connections } = v.parse(ConnectionsResponseSchema, fixture)
const local = (time: string): number => Date.parse(`2026-10-19T${time}:00+02:00`)
const seconds = (time: string): number => local(time) / 1000

function connection(index: number) {
  const found = connections[index]
  if (!found) throw new Error(`The fixture has no connection ${String(index)}`)
  return found
}

const liestal = { id: '8500023', name: 'Liestal', coordinate: { x: 47.484461, y: 7.731368 } }
const basel = { id: '8500010', name: 'Basel SBB', coordinate: { x: 47.547413, y: 7.58956 } }

const rideSection = (departure: Partial<ApiSection['departure']> = {}): ApiSection => ({
  journey: { category: 'S', number: '3', to: 'Basel SBB', operator: 'SBB' },
  walk: null,
  departure: {
    station: liestal,
    departureTimestamp: seconds('07:10'),
    delay: null,
    platform: '2',
    prognosis: null,
    ...departure,
  },
  arrival: { station: basel, arrivalTimestamp: seconds('07:26'), platform: '7', prognosis: null },
})

const firstRide = (section: ApiSection): RideLeg => {
  const [leg] = toJourney({ sections: [section] }).legs
  if (leg?.kind !== 'ride') throw new Error('Expected a ride')
  return leg
}

describe('toJourney', () => {
  it('maps a train, the walk to the tram and the tram', () => {
    const [train, walk, tram] = toJourney(connection(0)).legs

    expect(train).toEqual({
      kind: 'ride',
      line: { name: 'IR 37', mode: 'train', headsign: 'Basel SBB' },
      departure: {
        stop: {
          id: '8500023',
          name: 'Liestal',
          coordinates: { latitude: 47.484461, longitude: 7.731368 },
        },
        scheduledAt: local('07:05'),
        platform: '4',
      },
      arrival: {
        stop: {
          id: '8500010',
          name: 'Basel SBB',
          coordinates: { latitude: 47.547413, longitude: 7.58956 },
        },
        scheduledAt: local('07:16'),
        platform: '10',
      },
      stopovers: [],
      tripNumber: '2254',
      operator: 'SBB',
      cancelled: false,
    })
    expect(walk).toEqual({
      kind: 'walk',
      from: expect.objectContaining({ id: '8500010', name: 'Basel SBB' }),
      to: expect.objectContaining({ id: '8578143', name: 'Basel, Bahnhof SBB' }),
      duration: minutes(5),
    })
    expect(tram).toMatchObject({
      kind: 'ride',
      line: { name: '2', mode: 'tram' },
      departure: { scheduledAt: local('07:21'), platform: 'F' },
      arrival: { stop: { name: 'Basel, Messeplatz' }, scheduledAt: local('07:28') },
      operator: 'BVB',
    })
  })

  it('lists the stops between boarding and alighting', () => {
    const tram = toJourney(connection(0)).legs[2]
    if (tram?.kind !== 'ride') throw new Error('Expected a ride')

    expect(tram.stopovers.map(({ stop }) => stop.name)).toEqual([
      'Basel, Kirschgarten',
      'Basel, Bankverein',
      'Basel, Kunstmuseum',
      'Basel, Wettsteinplatz',
    ])
    expect(tram.stopovers[1]).toEqual({
      stop: { id: '8500237', name: 'Basel, Bankverein', coordinates: undefined },
      scheduledAt: local('07:24'),
      expectedAt: undefined,
      platform: 'C',
    })
  })

  it('takes delays of stopovers and skips stopovers without a time', () => {
    const ride = firstRide({
      ...rideSection(),
      journey: {
        category: 'S',
        number: '3',
        passList: [
          { station: liestal, departureTimestamp: seconds('07:10') },
          {
            station: { id: '8500300', name: 'Pratteln' },
            departureTimestamp: seconds('07:17'),
            delay: 2,
          },
          { station: { id: '8500301', name: 'Muttenz' } },
          { station: basel, arrivalTimestamp: seconds('07:26') },
        ],
      },
    })

    expect(ride.stopovers).toEqual([
      expect.objectContaining({
        stop: expect.objectContaining({ name: 'Pratteln' }),
        scheduledAt: local('07:17'),
        expectedAt: local('07:19'),
      }),
    ])
  })

  it('treats a section with a walk as a walk, even with an empty journey', () => {
    const [walk] = toJourney({
      sections: [
        {
          journey: {},
          walk: { duration: 240 },
          departure: { station: basel, departureTimestamp: seconds('07:26') },
          arrival: { station: basel, arrivalTimestamp: seconds('07:30') },
        },
      ],
    }).legs

    expect(walk).toMatchObject({ kind: 'walk', duration: minutes(4) })
  })

  it('uses the real-time prognosis and platform changes', () => {
    const ride = firstRide(
      rideSection({
        prognosis: { departure: '2026-10-19T07:13:00+0200', arrival: null, platform: '3' },
      }),
    )

    expect(ride.departure).toMatchObject({
      scheduledAt: local('07:10'),
      expectedAt: local('07:13'),
      platform: '2',
      expectedPlatform: '3',
    })
  })

  it('falls back to the reported delay in minutes', () => {
    expect(firstRide(rideSection({ delay: 3 })).departure.expectedAt).toBe(local('07:13'))
  })

  it('ignores a prognosis platform that matches the schedule', () => {
    const ride = firstRide(
      rideSection({ prognosis: { departure: null, arrival: null, platform: '2' } }),
    )

    expect(ride.departure.expectedPlatform).toBeUndefined()
  })

  it('rejects a ride without a departure time', () => {
    expect(() => toJourney({ sections: [rideSection({ departureTimestamp: null })] })).toThrow(
      TimetableError,
    )
  })

  it('derives the walking time from the timestamps if needed', () => {
    const [walk] = toJourney({
      sections: [
        {
          journey: null,
          walk: { duration: null },
          departure: { station: basel, departureTimestamp: seconds('07:26') },
          arrival: { station: liestal, arrivalTimestamp: seconds('07:32') },
        },
      ],
    }).legs

    expect(walk).toMatchObject({ kind: 'walk', duration: minutes(6) })
  })
})

describe('toLine', () => {
  it.each([
    [
      { category: 'S', number: '3' },
      { name: 'S3', mode: 'train' },
    ],
    [
      { category: 'IR', number: '37' },
      { name: 'IR 37', mode: 'train' },
    ],
    [
      { category: 'IR', number: null },
      { name: 'IR', mode: 'train' },
    ],
    [
      { category: 'ICE', number: '000107' },
      { name: 'ICE 107', mode: 'train' },
    ],
    [
      { category: 'B', number: '80' },
      { name: '80', mode: 'bus' },
    ],
    [
      { category: 'BN', number: 'N8' },
      { name: 'N8', mode: 'bus' },
    ],
    [
      { category: 'T', number: '2' },
      { name: '2', mode: 'tram' },
    ],
    [
      { category: 'BAT', number: null },
      { name: 'BAT', mode: 'ship' },
    ],
    [
      { category: 'XYZ', number: '5' },
      { name: '5', mode: 'other' },
    ],
  ])('names %o as %o', (journey, expected) => {
    expect(toLine({ ...journey, to: null, operator: null })).toMatchObject(expected)
  })
})

describe('toStop', () => {
  it('reads the latitude from x and the longitude from y', () => {
    expect(toStop(liestal).coordinates).toEqual({ latitude: 47.484461, longitude: 7.731368 })
  })

  it('handles missing coordinates and ids', () => {
    expect(toStop({ id: null, name: 'Basel', coordinate: null })).toEqual({
      id: 'Basel',
      name: 'Basel',
      coordinates: undefined,
    })
  })
})
