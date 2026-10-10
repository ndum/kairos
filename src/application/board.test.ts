import { describe, expect, it } from 'vitest'

import { at, commute, journey, morningCommute, ride, walk } from '@/test/builders'

import { buildBoard, nextLeaveAt } from './board'

const endpoints = commute
const preferredLines = ['S1', '20']

/** S1 to Central, then tram 9, which is not a preferred line. */
const viaTram = (departure: string, tramArrival: string) =>
  journey(
    ride('S1', 'Riverside', departure, 'Central', '07:14'),
    walk('Central', 'Central, Bus Station', 1),
    ride('9', 'Central, Bus Station', '07:16', 'Market Square', tramArrival, { mode: 'tram' }),
  )

describe('buildBoard', () => {
  const journeys = [morningCommute('06:59'), morningCommute('07:05'), morningCommute('07:29')]

  describe('with a schedule', () => {
    const schedule = [...journeys, morningCommute('07:35')]

    it('starts with the latest trip that arrives in time and lists the earlier ones', () => {
      const target = { kind: 'arrive', by: at('07:55') } as const
      const board = buildBoard(schedule, endpoints, preferredLines, at('06:40'), target)

      expect(board.main?.departureAt).toBe(at('07:29'))
      expect(board.upcoming.map((trip) => trip.departureAt)).toEqual([at('07:05'), at('06:59')])
      expect(board).toMatchObject({ target, late: false })
    })

    it('shows the next trips once none arrives in time any more', () => {
      const target = { kind: 'arrive', by: at('07:30') } as const
      const board = buildBoard(schedule, endpoints, preferredLines, at('07:20'), target)

      expect(board.main?.departureAt).toBe(at('07:35'))
      expect(board.late).toBe(true)
    })

    it('cannot tell whether the user is late without journeys', () => {
      const target = { kind: 'arrive', by: at('07:30') } as const

      expect(buildBoard([], endpoints, preferredLines, at('07:20'), target).late).toBe(false)
    })

    it('starts the way back with the first trip after the time of the schedule', () => {
      const target = { kind: 'return', from: at('07:10') } as const
      const board = buildBoard(schedule, endpoints, preferredLines, at('06:00'), target)

      expect(board.main?.departureAt).toBe(at('07:29'))
      expect(board.upcoming.map((trip) => trip.departureAt)).toEqual([at('07:35')])
      expect(board.tight).toBeNull()
    })
  })

  it('picks the trip that arrives first, even when a slower one leaves earlier', () => {
    const slow = journey(ride('S1', 'Riverside', '07:05', 'Market Square', '07:45'))
    const fast = journey(ride('IR 2', 'Riverside', '07:10', 'Market Square', '07:30'))

    const board = buildBoard([slow, fast], endpoints, [], at('06:40'))

    expect(board.main?.journey).toBe(fast)
    expect(board.upcoming).toEqual([])
  })

  it('selects the trips on the preferred lines', () => {
    const board = buildBoard(journeys, endpoints, preferredLines, at('06:40'))

    expect(board.main?.departureAt).toBe(at('06:59'))
    expect(board.upcoming.map((trip) => trip.departureAt)).toEqual([at('07:05'), at('07:29')])
    expect(board.tight).toBeNull()
    expect(board.alternative).toBeNull()
    expect(board.transferRisk).toBe('ok')
  })

  it('keeps the preferred variant when another line is faster and offers that line as a hint', () => {
    const board = buildBoard(
      [morningCommute('07:05'), viaTram('07:05', '07:19')],
      endpoints,
      preferredLines,
      at('06:40'),
    )

    expect(board.main?.journey.legs.at(-1)).toMatchObject({ line: { name: '20' } })
    expect(board.alternative?.journey.legs.at(-1)).toMatchObject({ line: { name: '9' } })
  })

  it('reports the transfer risk of the main trip', () => {
    const board = buildBoard(
      [morningCommute('07:05', { delay: 3 })],
      endpoints,
      preferredLines,
      at('06:40'),
    )

    expect(board.transferRisk).toBe('broken')
  })

  it('ignores journeys without vehicles', () => {
    const board = buildBoard(
      [journey(walk('Riverside', 'Market Square', 40))],
      endpoints,
      preferredLines,
      at('06:40'),
    )

    expect(board.main).toBeNull()
  })
})

describe('nextLeaveAt', () => {
  it('prefers the tight trip, then the main trip', () => {
    const journeys = [morningCommute('06:59'), morningCommute('07:05')]

    expect(nextLeaveAt(buildBoard(journeys, endpoints, preferredLines, at('06:50')))).toBe(
      at('06:48'),
    )
    expect(nextLeaveAt(buildBoard(journeys, endpoints, preferredLines, at('06:40')))).toBe(
      at('06:48'),
    )
    expect(nextLeaveAt(buildBoard([], endpoints, preferredLines, at('06:40')))).toBeNull()
  })
})
