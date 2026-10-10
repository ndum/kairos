import { type Journey, type StopEvent, expectedTime } from './journey'
import { type Duration, minutes } from './time'

/**
 * - ok: the connection works as planned
 * - tight: delays leave less than two minutes, and less than planned
 * - broken: the connecting vehicle leaves before it can be reached
 */
export type TransferRisk = 'ok' | 'tight' | 'broken'

export const TIGHT_TRANSFER: Duration = minutes(2)

export interface Transfer {
  readonly arrival: StopEvent
  readonly departure: StopEvent
  /** Walking time between the two vehicles. */
  readonly walk: Duration
  /** Time left after the walk, based on the real-time prognosis. */
  readonly slack: Duration
  readonly risk: TransferRisk
}

export function transfersOf(journey: Journey): Transfer[] {
  const transfers: Transfer[] = []
  let arrival: StopEvent | null = null
  let walk = 0

  for (const leg of journey.legs) {
    if (leg.kind === 'walk') {
      walk += leg.duration
      continue
    }
    if (arrival) {
      const planned = leg.departure.scheduledAt - arrival.scheduledAt - walk
      const slack = expectedTime(leg.departure) - expectedTime(arrival) - walk
      transfers.push({
        arrival,
        departure: leg.departure,
        walk,
        slack,
        risk: riskOf(slack, planned),
      })
    }
    arrival = leg.arrival
    walk = 0
  }
  return transfers
}

const riskOf = (slack: Duration, planned: Duration): TransferRisk => {
  if (slack < 0) return 'broken'
  return slack < TIGHT_TRANSFER && slack < planned ? 'tight' : 'ok'
}

/** The most severe risk of all transfers of a journey. */
export function transferRiskOf(journey: Journey): TransferRisk {
  const risks = new Set(transfersOf(journey).map((transfer) => transfer.risk))
  if (risks.has('broken')) return 'broken'
  return risks.has('tight') ? 'tight' : 'ok'
}
