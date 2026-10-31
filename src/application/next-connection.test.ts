import { describe, expect, it, vi } from 'vitest'

import { transfersOf } from '@/domain/transfer'
import { at, journey, morningCommute, ride, stop } from '@/test/builders'

import { findNextConnection } from './next-connection'
import type { TimetablePort } from './ports/timetable'

const timetable = (journeys: ReturnType<typeof journey>[]) => ({
  findJourneys: vi.fn<TimetablePort['findJourneys']>().mockResolvedValue(journeys),
  searchStops: vi.fn(),
  stopsNear: vi.fn(),
})

const bus = (departure: string, options = {}) =>
  journey(ride('20', 'Central, Bus Station', departure, 'Market Square', '07:45', options))

describe('findNextConnection', () => {
  // The S1 arrives at 07:17 instead of 07:14, the bus at 07:19 is gone after the walk.
  const [broken] = transfersOf(morningCommute('07:05', { delay: 3 }))
  if (!broken) throw new Error('Expected a transfer')

  it('asks from the stop of the connecting vehicle once the user is there', async () => {
    const port = timetable([bus('07:26')])

    await findNextConnection(port, broken, stop('Market Square'))

    expect(port.findJourneys).toHaveBeenCalledWith(
      { from: broken.departure.stop, to: stop('Market Square'), at: at('07:21'), limit: 4 },
      undefined,
    )
  })

  it('takes the first journey the user can still reach', async () => {
    const next = bus('07:26')
    const port = timetable([bus('07:19'), bus('07:23', { cancelled: true }), next])

    await expect(findNextConnection(port, broken, stop('Market Square'))).resolves.toBe(next)
  })

  it('finds nothing when no journey can be reached', async () => {
    const port = timetable([bus('07:19')])

    await expect(findNextConnection(port, broken, stop('Market Square'))).resolves.toBeNull()
  })
})
