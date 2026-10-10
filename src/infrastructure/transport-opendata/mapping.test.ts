import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { TimetableError } from '@/application/ports/timetable'
import type { RideLeg } from '@/domain/journey'
import { minutes } from '@/domain/time'

import fixture from './fixtures/connections.json'
import { toJourney, toLine, toStop } from './mapping'
import { type ApiSection, ConnectionsResponseSchema } from './schema'

const { connections } = v.parse(ConnectionsResponseSchema, fixture)
const local = (time: string): number => Date.parse(`2026-10-12T${time}:00+02:00`)
const seconds = (time: string): number => local(time) / 1000

function connection(index: number) {
  const found = connections[index]
  if (!found) throw new Error(`The fixture has no connection ${String(index)}`)
  return found
}

const thun = { id: '8507100', name: 'Thun', coordinate: { x: 46.754852, y: 7.629607 } }
const bern = { id: '8507000', name: 'Bern', coordinate: { x: 46.948831, y: 7.439129 } }

const rideSection = (departure: Partial<ApiSection['departure']> = {}): ApiSection => ({
  journey: { category: 'S', number: '11', to: 'Bern', operator: 'SBB' },
  walk: null,
  departure: {
    station: thun,
    departureTimestamp: seconds('07:08'),
    delay: null,
    platform: '4',
    prognosis: null,
    ...departure,
  },
  arrival: { station: bern, arrivalTimestamp: seconds('07:36'), platform: '7', prognosis: null },
})

const firstRide = (section: ApiSection): RideLeg => {
  const [leg] = toJourney({ sections: [section] }).legs
  if (leg?.kind !== 'ride') throw new Error('Expected a ride')
  return leg
}

describe('toJourney', () => {
  it('maps a train followed by a walk', () => {
    expect(toJourney(connection(0)).legs).toEqual([
      {
        kind: 'ride',
        line: { name: 'IC 61', mode: 'train', headsign: 'Basel SBB' },
        departure: {
          stop: {
            id: '8507100',
            name: 'Thun',
            coordinates: { latitude: 46.754852, longitude: 7.629607 },
          },
          scheduledAt: local('07:04'),
          platform: '3',
        },
        arrival: {
          stop: {
            id: '8507000',
            name: 'Bern',
            coordinates: { latitude: 46.948831, longitude: 7.439129 },
          },
          scheduledAt: local('07:25'),
          platform: '5',
        },
        cancelled: false,
      },
      {
        kind: 'walk',
        from: {
          id: '8507000',
          name: 'Bern',
          coordinates: { latitude: 46.948831, longitude: 7.439129 },
        },
        to: expect.objectContaining({ id: '8507110', name: 'Bern, Zytglogge' }),
        duration: minutes(17),
      },
    ])
  })

  it('maps a transfer from a train to a bus', () => {
    const legs = toJourney(connection(1)).legs

    expect(legs.map((leg) => leg.kind)).toEqual(['ride', 'walk', 'ride'])
    expect(legs[1]).toMatchObject({ kind: 'walk', duration: minutes(4) })
    expect(legs[2]).toMatchObject({
      kind: 'ride',
      line: { name: '19', mode: 'bus' },
      departure: { scheduledAt: local('07:29'), platform: 'M' },
    })
  })

  it('uses the real-time prognosis and platform changes', () => {
    const ride = firstRide(
      rideSection({
        prognosis: { departure: '2026-10-12T07:11:00+0200', arrival: null, platform: '5' },
      }),
    )

    expect(ride.departure).toMatchObject({
      scheduledAt: local('07:08'),
      expectedAt: local('07:11'),
      platform: '4',
      expectedPlatform: '5',
    })
  })

  it('falls back to the reported delay in minutes', () => {
    expect(firstRide(rideSection({ delay: 3 })).departure.expectedAt).toBe(local('07:11'))
  })

  it('ignores a prognosis platform that matches the schedule', () => {
    const ride = firstRide(
      rideSection({ prognosis: { departure: null, arrival: null, platform: '4' } }),
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
          departure: { station: bern, departureTimestamp: seconds('07:25') },
          arrival: { station: thun, arrivalTimestamp: seconds('07:31') },
        },
      ],
    }).legs

    expect(walk).toMatchObject({ kind: 'walk', duration: minutes(6) })
  })
})

describe('toLine', () => {
  it.each([
    [
      { category: 'S', number: '11' },
      { name: 'S11', mode: 'train' },
    ],
    [
      { category: 'IC', number: '61' },
      { name: 'IC 61', mode: 'train' },
    ],
    [
      { category: 'IR', number: null },
      { name: 'IR', mode: 'train' },
    ],
    [
      { category: 'B', number: '19' },
      { name: '19', mode: 'bus' },
    ],
    [
      { category: 'T', number: '9' },
      { name: '9', mode: 'tram' },
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
    expect(toStop(thun).coordinates).toEqual({ latitude: 46.754852, longitude: 7.629607 })
  })

  it('handles missing coordinates and ids', () => {
    expect(toStop({ id: null, name: 'Bern', coordinate: null })).toEqual({
      id: 'Bern',
      name: 'Bern',
      coordinates: undefined,
    })
  })
})
