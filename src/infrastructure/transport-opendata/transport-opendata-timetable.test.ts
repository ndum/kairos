import { describe, expect, it, vi } from 'vitest'

import type { JourneyQuery } from '@/application/ports/timetable'

import connections from './fixtures/connections.json'
import locations from './fixtures/locations.json'
import { TransportOpendataTimetable } from './transport-opendata-timetable'

const query: JourneyQuery = {
  from: { id: '8507100', name: 'Thun' },
  to: { id: '8507110', name: 'Bern, Zytglogge' },
  at: Date.parse('2026-10-12T07:00:00+02:00'),
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
        from: '8507100',
        to: '8507110',
        date: '2026-10-12',
        time: '07:00',
        isArrivalTime: '0',
        limit: '4',
      },
    )
    expect(url.searchParams.getAll('fields[]')).toContain(
      'connections/sections/departure/prognosis',
    )
  })

  it('asks for arrivals when planning by arrival time', async () => {
    const fetch = fakeFetch(json(connections))

    await timetable(fetch).findJourneys({ ...query, arriveBy: true })

    expect(requestedUrl(fetch).searchParams.get('isArrivalTime')).toBe('1')
  })

  it('maps every connection to a journey', async () => {
    const journeys = await timetable(fakeFetch(json(connections))).findJourneys(query)

    expect(journeys).toHaveLength(4)
    expect(journeys[0]?.legs[0]).toMatchObject({ kind: 'ride', line: { name: 'IC 61' } })
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

    const stops = await timetable(fetch).searchStops('Zytglogge')

    expect(requestedUrl(fetch).searchParams.get('query')).toBe('Zytglogge')
    expect(stops[0]).toMatchObject({ id: '8507110', name: 'Bern, Zytglogge' })
  })

  it('skips stations without an id', async () => {
    const stops = await timetable(
      fakeFetch(
        json({
          stations: [
            { id: null, name: 'Bern' },
            { id: '8507000', name: 'Bern' },
          ],
        }),
      ),
    ).searchStops('Bern')

    expect(stops).toEqual([{ id: '8507000', name: 'Bern', coordinates: undefined }])
  })
})
