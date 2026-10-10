import { type Journey, ridesOf } from './journey'
import type { Instant } from './time'
import type { Trip } from './trip'
import { isReachableWithReserve, urgencyOf } from './urgency'

const normalize = (lineName: string): string => lineName.trim().toUpperCase()

/** True when every vehicle of the journey runs on one of the preferred lines. */
export function usesPreferredLines(journey: Journey, preferredLines: readonly string[]): boolean {
  if (preferredLines.length === 0) return true
  const preferred = new Set(preferredLines.map(normalize))
  return ridesOf(journey).every((ride) => preferred.has(normalize(ride.line.name)))
}

export interface PreferenceSplit {
  readonly preferred: Trip[]
  readonly alternatives: Trip[]
}

export function splitByPreference(
  trips: readonly Trip[],
  preferredLines: readonly string[],
): PreferenceSplit {
  const split: PreferenceSplit = { preferred: [], alternatives: [] }
  for (const trip of trips) {
    const group = usesPreferredLines(trip.journey, preferredLines) ? 'preferred' : 'alternatives'
    split[group].push(trip)
  }
  return split
}

const isCancelled = (trip: Trip): boolean => ridesOf(trip.journey).some((ride) => ride.cancelled)

/**
 * Alternatives on other lines are only worth a hint when they arrive earlier than the main
 * preferred trip, or when that trip is cancelled. Returns the earliest such alternative.
 */
export function noteworthyAlternative(
  main: Trip | null,
  alternatives: readonly Trip[],
  now: Instant,
): Trip | null {
  const candidates = alternatives
    .filter((trip) => !isCancelled(trip) && isReachableWithReserve(urgencyOf(trip, now)))
    .filter((trip) => !main || isCancelled(main) || trip.arrivalAt < main.arrivalAt)
    .sort((a, b) => a.arrivalAt - b.arrivalAt)

  return candidates[0] ?? null
}
