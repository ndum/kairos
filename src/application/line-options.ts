import type { Journey } from '@/domain/journey'
import { type LineUsage, combineLineUsage, linesUsedBy } from '@/domain/line-preference'
import type { StopRef } from '@/domain/route'
import type { Instant } from '@/domain/time'

import type { TimetablePort } from './ports/timetable'

/** Journeys looked at per direction. */
export const LINE_SAMPLE_SIZE = 8

export interface LineOptions {
  /** The journeys looked at, to show how many of them a choice of lines covers. */
  readonly journeys: readonly Journey[]
  /** Lines in the order they are ridden on the way out, the ones only used back follow. */
  readonly lines: readonly LineUsage[]
}

/** Suggests lines to prefer on a route, based on the next journeys between its stops. */
export async function findLineOptions(
  timetable: TimetablePort,
  [first, second]: readonly [StopRef, StopRef],
  at: Instant,
  signal?: AbortSignal,
): Promise<LineOptions> {
  const [outbound, back] = await Promise.all([
    timetable.findJourneys({ from: first, to: second, at, limit: LINE_SAMPLE_SIZE }, signal),
    timetable.findJourneys({ from: second, to: first, at, limit: LINE_SAMPLE_SIZE }, signal),
  ])
  return {
    journeys: [...outbound, ...back],
    lines: combineLineUsage(linesUsedBy(outbound), linesUsedBy(back)),
  }
}
