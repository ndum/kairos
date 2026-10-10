import { type Journey, expectedTime, ridesOf } from './journey'
import { lineKey } from './line-preference'
import type { PreferredLine } from './route'
import type { Duration } from './time'

/** A way between two stops, given by the lines it rides in order, for example S3, then tram 1. */
export interface Variant {
  readonly lines: readonly PreferredLine[]
  /** How many of the journeys looked at take exactly these lines. */
  readonly journeys: number
  /** The shortest time from the first departure to the last arrival among those journeys. */
  readonly duration: Duration
}

/** Groups journeys by the lines they ride, the fastest variant first. */
export function variantsOf(journeys: readonly Journey[]): Variant[] {
  const variants = new Map<
    string,
    { lines: PreferredLine[]; journeys: number; duration: Duration }
  >()

  for (const journey of journeys) {
    const rides = ridesOf(journey)
    const first = rides[0]
    const last = rides.at(-1)
    if (!first || !last || rides.some((ride) => ride.cancelled)) continue

    const key = rides.map((ride) => lineKey(ride.line.name)).join('>')
    const duration = expectedTime(last.arrival) - expectedTime(first.departure)
    const variant = variants.get(key)
    if (variant) {
      variant.journeys += 1
      variant.duration = Math.min(variant.duration, duration)
    } else {
      const lines = rides.map(({ line }) => ({ name: line.name.trim(), mode: line.mode }))
      variants.set(key, { lines, journeys: 1, duration })
    }
  }

  return [...variants.values()].sort((a, b) => a.duration - b.duration || b.journeys - a.journeys)
}

/**
 * The variants worth offering: the fastest one and the most frequent others, in the order of
 * their duration. Variants are expected sorted like variantsOf returns them.
 */
export function mainVariants(variants: readonly Variant[], count: number): Variant[] {
  const [fastest, ...others] = variants
  if (!fastest || count < 1) return []
  const frequent = [...others]
    .sort((a, b) => b.journeys - a.journeys || a.duration - b.duration)
    .slice(0, count - 1)
  return [fastest, ...frequent].sort((a, b) => a.duration - b.duration || b.journeys - a.journeys)
}

/** The lines a journey rides, each once, to prefer them. */
export const linesOfJourney = (journey: Journey): PreferredLine[] =>
  linesOfVariant({
    lines: ridesOf(journey).map(({ line }) => ({ name: line.name.trim(), mode: line.mode })),
  })

/** The lines to prefer for a variant, each once. */
export function linesOfVariant(variant: Pick<Variant, 'lines'>): PreferredLine[] {
  const seen = new Set<string>()
  return variant.lines.filter((line) => {
    const key = lineKey(line.name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** True when the preferred lines are exactly the lines of the variant, in any order. */
export function prefersVariant(
  preferredLines: readonly PreferredLine[],
  variant: Pick<Variant, 'lines'>,
): boolean {
  const keys = (lines: readonly PreferredLine[]) =>
    [...new Set(lines.map((line) => lineKey(line.name)))].sort().join(',')
  return preferredLines.length > 0 && keys(preferredLines) === keys(variant.lines)
}
