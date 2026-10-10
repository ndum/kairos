import { type Journey, type TransportMode, ridesOf } from './journey'
import type { Instant } from './time'
import type { Trip } from './trip'
import { isReachableWithBuffer, urgencyOf } from './urgency'

/** Compares line names regardless of case and surrounding spaces. */
export const lineKey = (lineName: string): string => lineName.trim().toUpperCase()

/** True when every vehicle of the journey runs on one of the preferred lines. */
export function usesPreferredLines(journey: Journey, preferredLines: readonly string[]): boolean {
  if (preferredLines.length === 0) return true
  const preferred = new Set(preferredLines.map(lineKey))
  return ridesOf(journey).every((ride) => preferred.has(lineKey(ride.line.name)))
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
    .filter((trip) => !isCancelled(trip) && isReachableWithBuffer(urgencyOf(trip, now)))
    .filter((trip) => !main || isCancelled(main) || trip.arrivalAt < main.arrivalAt)
    .sort((a, b) => a.arrivalAt - b.arrivalAt)

  return candidates[0] ?? null
}

export interface LineUsage {
  readonly name: string
  readonly mode: TransportMode
  /** Number of journeys that use the line. */
  readonly journeys: number
}

const compareNames = new Intl.Collator('de-CH', { numeric: true }).compare

/**
 * Lists the lines of the journeys once each, in the order they are ridden: lines that start
 * a journey come first, and more frequent lines come first among those at the same position.
 */
export function linesUsedBy(journeys: readonly Journey[]): LineUsage[] {
  const usage = new Map<
    string,
    { name: string; mode: TransportMode; journeys: number; position: number }
  >()

  for (const journey of journeys) {
    const counted = new Set<string>()
    ridesOf(journey).forEach(({ line }, position) => {
      const key = lineKey(line.name)
      const entry = usage.get(key) ?? {
        name: line.name.trim(),
        mode: line.mode,
        journeys: 0,
        position,
      }
      entry.position = Math.min(entry.position, position)
      if (!counted.has(key)) entry.journeys += 1
      counted.add(key)
      usage.set(key, entry)
    })
  }

  return [...usage.values()]
    .sort(
      (a, b) => a.position - b.position || b.journeys - a.journeys || compareNames(a.name, b.name),
    )
    .map(({ name, mode, journeys: count }) => ({ name, mode, journeys: count }))
}

/**
 * Combines the lines of both directions of a route. The first list keeps its order, lines
 * only found in the second one follow.
 */
export function combineLineUsage(
  first: readonly LineUsage[],
  second: readonly LineUsage[],
): LineUsage[] {
  const combined = new Map(first.map((usage) => [lineKey(usage.name), usage]))
  for (const usage of second) {
    const key = lineKey(usage.name)
    const entry = combined.get(key)
    combined.set(key, entry ? { ...entry, journeys: entry.journeys + usage.journeys } : usage)
  }
  return [...combined.values()]
}
