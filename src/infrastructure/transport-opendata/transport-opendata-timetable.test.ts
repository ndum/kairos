import { describe, expect, it, vi } from 'vitest'

import type { JourneyQuery } from '@/application/ports/timetable'

import connections from './fixtures/connections.json'
import locations from './fixtures/locations.json'
import { TransportOpendataTimetable } from './transport-opendata-timetable'

const query: JourneyQuery = {
  from: { id: '8500023', name: 'Liestal' },
  to: { id: '8500899', name: 'Basel, Messeplatz' },
  at: Date.parse('2026-10-19T07:00:00+02:00'),
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const fakeFetch = (response: Response) =>
  vi.fn<typeof globalThis.fetch>().mockResolvedValue(response)

const timetable = (fetch: typeof globalThis.fetch) =>
  new TransportOpendataTimetable({ fetch, timeout: 50 })

function requestedUrl(fetch: ReturnType<typeof fakeFetch>): URL {
  const input = fetch.mock.calls[0]?.[0]
  if (typeof input !== 'string') throw new Error('Expected a request to a URL string')
  return new URL(input)
}

describe('findJourneys', () => {
  it('asks for connections in Swiss time with the needed fields only', async () => {
    const fetch = fakeFetch(json(connections))

    await timetable(fetch).findJourneys({ ...query, limit: 4 })

    const url = requestedUrl(fetch)
    expect(`${url.origin}${url.pathname}`).toBe('https://transport.opendata.ch/v1/connections')
    expect(Object.fromEntries([...url.searchParams].filter(([key]) => key !== 'fields[]'))).toEqual(
      {
        from: '8500023',
        to: '8500899',
        date: '2026-10-19',
        time: '07:00',
        isArrivalTime: '0',
        limit: '4',
      },
    )
    expect(url.searchParams.getAll('fields[]')).toEqual(
      expect.arrayContaining([
        'connections/sections/departure/prognosis',
        'connections/sections/journey/passList/departureTimestamp',
      ]),
    )
  })

  it('asks for arrivals when planning by arrival time', async () => {
    const fetch = fakeFetch(json(connections))

    await timetable(fetch).findJourneys({ ...query, arriveBy: true })

    expect(requestedUrl(fetch).searchParams.get('isArrivalTime')).toBe('1')
  })

  it('maps every connection to a journey', async () => {
    const journeys = await timetable(fakeFetch(json(connections))).findJourneys(query)

    expect(journeys).toHaveLength(6)
    expect(journeys[0]?.legs.map((leg) => leg.kind)).toEqual(['ride', 'walk', 'ride'])
    expect(journeys[0]?.legs[0]).toMatchObject({ kind: 'ride', line: { name: 'IR 37' } })
  })

  it('reports HTTP errors', async () => {
    await expect(timetable(fakeFetch(json({}, 503))).findJourneys(query)).rejects.toMatchObject({
      name: 'TimetableError',
      reason: 'http',
    })
  })

  it('reports data that does not match the schema', async () => {
    await expect(
      timetable(fakeFetch(json({ connections: 'none' }))).findJourneys(query),
    ).rejects.toMatchObject({ reason: 'invalid-response' })
  })

  it('reports malformed JSON', async () => {
    await expect(
      timetable(fakeFetch(new Response('<html>'))).findJourneys(query),
    ).rejects.toMatchObject({ reason: 'invalid-response' })
  })

  it('reports network failures', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(timetable(fetch).findJourneys(query)).rejects.toMatchObject({ reason: 'network' })
  })

  it('gives up after the timeout', async () => {
    const hanging = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason as Error)
          })
        }),
    )

    await expect(timetable(hanging).findJourneys(query)).rejects.toMatchObject({
      reason: 'timeout',
    })
  })

  it('passes aborts requested by the caller through', async () => {
    const controller = new AbortController()
    const fetch = vi.fn<typeof globalThis.fetch>(() => {
      controller.abort()
      return Promise.reject(new DOMException('Aborted', 'AbortError'))
    })

    await expect(timetable(fetch).findJourneys(query, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})

describe('searchStops', () => {
  it('searches stations by name', async () => {
    const fetch = fakeFetch(json(locations))

    const stops = await timetable(fetch).searchStops('Liestal')

    expect(requestedUrl(fetch).searchParams.get('query')).toBe('Liestal')
    expect(stops[0]).toMatchObject({ id: '8500023', name: 'Liestal' })
  })

  it('skips stations without an id', async () => {
    const stops = await timetable(
      fakeFetch(
        json({
          stations: [
            { id: null, name: 'Basel' },
            { id: '8500010', name: 'Basel SBB' },
          ],
        }),
      ),
    ).searchStops('Basel')

    expect(stops).toEqual([{ id: '8500010', name: 'Basel SBB', coordinates: undefined }])
  })
})

describe('stopsNear', () => {
  it('asks for stations around the position and skips the address found there', async () => {
    const fetch = fakeFetch(
      json({
        stations: [
          {
            id: null,
            name: 'Rathausstrasse 11, 4410 Liestal',
            coordinate: { x: 47.4862, y: 7.7305 },
          },
          { id: '8578318', name: 'Liestal, Kantonsspital', coordinate: { x: 47.4871, y: 7.7305 } },
          { id: '8500023', name: 'Liestal', coordinate: { x: 47.4844, y: 7.7313 } },
          { id: '8500999', name: 'Somewhere', coordinate: null },
        ],
      }),
    )

    const stops = await timetable(fetch).stopsNear({ latitude: 47.486, longitude: 7.73 })

    const params = requestedUrl(fetch).searchParams
    expect([params.get('x'), params.get('y'), params.get('type')]).toEqual([
      '47.486',
      '7.73',
      'station',
    ])
    expect(stops.map((stop) => stop.name)).toEqual(['Liestal, Kantonsspital', 'Liestal'])
  })
})

describe('searchPlaces', () => {
  it('finds companies and buildings by name', async () => {
    const fetch = fakeFetch(
      json({
        stations: [
          { id: null, name: 'Kunstmuseum Basel | Neubau', coordinate: { x: 47.5545, y: 7.5948 } },
          { id: null, name: ' ', coordinate: { x: 47.5, y: 7.5 } },
          { id: null, name: 'Without position', coordinate: null },
        ],
      }),
    )

    const places = await timetable(fetch).searchPlaces('Kunstmuseum')

    expect(requestedUrl(fetch).searchParams.get('type')).toBe('poi')
    expect(places).toEqual([
      {
        name: 'Kunstmuseum Basel | Neubau',
        kind: 'poi',
        coordinates: { latitude: 47.5545, longitude: 7.5948 },
      },
    ])
  })
})
