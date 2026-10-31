import { describe, expect, it } from 'vitest'

import { at, journey, morningCommute, ride, walk } from '@/test/builders'

import { minutes } from './time'
import { nextTransfer, transferRiskOf, transfersOf } from './transfer'

describe('transfersOf', () => {
  it('measures the slack after the walk between two vehicles', () => {
    const [transfer] = transfersOf(morningCommute('07:05'))

    expect(transfer).toMatchObject({ walk: minutes(4), slack: minutes(1), risk: 'ok' })
  })

  it('flags a transfer that delays have made tight', () => {
    const [transfer] = transfersOf(
      journey(
        ride('S2', 'Riverside', '06:59', 'Central', '07:10', { delay: 2 }),
        walk('Central', 'Central, Bus Station', 4),
        ride('20', 'Central, Bus Station', '07:19', 'Market Square', '07:23', { mode: 'bus' }),
      ),
    )

    expect(transfer).toMatchObject({ slack: minutes(3), risk: 'ok' })
  })

  it('flags a transfer with less than two minutes left', () => {
    const transfers = transfersOf(
      journey(
        ride('S2', 'Riverside', '06:59', 'Central', '07:10', { delay: 4 }),
        walk('Central', 'Central, Bus Station', 4),
        ride('20', 'Central, Bus Station', '07:19', 'Market Square', '07:23', { mode: 'bus' }),
      ),
    )

    expect(transfers[0]).toMatchObject({ slack: minutes(1), risk: 'tight' })
  })

  it('flags a transfer that can no longer be made', () => {
    const transfers = transfersOf(morningCommute('07:05', { delay: 3 }))

    expect(transfers[0]).toMatchObject({ slack: minutes(-2), risk: 'broken' })
  })

  it('returns no transfers for a direct journey', () => {
    expect(transfersOf(journey(ride('S1', 'Central', '16:45', 'Riverside', '16:53')))).toEqual([])
  })
})

describe('transferRiskOf', () => {
  it('reports the most severe risk', () => {
    expect(transferRiskOf(morningCommute('07:05'))).toBe('ok')
    expect(transferRiskOf(morningCommute('07:05', { delay: 3 }))).toBe('broken')
  })

  it('reports a tight transfer', () => {
    const tight = journey(
      ride('S2', 'Riverside', '06:59', 'Central', '07:10', { delay: 4 }),
      walk('Central', 'Central, Bus Station', 4),
      ride('20', 'Central, Bus Station', '07:19', 'Market Square', '07:23', { mode: 'bus' }),
    )

    expect(transferRiskOf(tight)).toBe('tight')
  })
})

describe('nextTransfer', () => {
  const commute = morningCommute('07:05')

  it('finds the transfer ahead with the vehicle to change to', () => {
    for (const now of [at('07:00'), at('07:12')]) {
      const next = nextTransfer(commute, now)

      expect(next?.ride.line.name).toBe('20')
      expect(next?.transfer.slack).toBe(minutes(1))
    }
  })

  it('finds nothing once the last vehicle has left or without a transfer', () => {
    expect(nextTransfer(commute, at('07:20'))).toBeNull()
    expect(
      nextTransfer(
        journey(ride('S1', 'Riverside', '07:05', 'Market Square', '07:30')),
        at('07:00'),
      ),
    ).toBeNull()
  })
})
