import { lineKey } from './line-preference'
import { type Place, type PreferredLine, type Route, stopsOf } from './route'
import { type Duration, MINUTE } from './time'

export const NAME_MAX_LENGTH = 40
export const WALK_MAX: Duration = 60 * MINUTE
export const BUFFER_MAX: Duration = 30 * MINUTE
/** Buffer of new routes and of routes stored before the buffer moved to the route. */
export const DEFAULT_BUFFER: Duration = 3 * MINUTE

const inRange = (value: Duration, max: Duration): boolean => value >= 0 && value <= max

/** Names of routes and places must not be blank, and short enough for a phone screen. */
export function isValidName(name: string): boolean {
  const length = name.trim().length
  return length > 0 && length <= NAME_MAX_LENGTH
}

export const isValidPlace = (place: Place): boolean =>
  isValidName(place.name) &&
  stopsOf(place).every(({ stop, walk }) => stop.id !== '' && inRange(walk, WALK_MAX)) &&
  place.secondStop?.stop.id !== place.stop.id

/** No stop serves both places, or a trip could start where it ends. */
export const hasDistinctStops = (route: Pick<Route, 'places'>): boolean => {
  const [first, second] = route.places
  const ids = new Set(stopsOf(first).map(({ stop }) => stop.id))
  return stopsOf(second).every(({ stop }) => !ids.has(stop.id))
}

export const isValidRoute = (route: Route): boolean =>
  isValidName(route.name) &&
  route.places.every(isValidPlace) &&
  hasDistinctStops(route) &&
  inRange(route.buffer, BUFFER_MAX)

/** Trims line names and drops blanks and duplicates, keeping the first spelling. */
export function normalizeLines(lines: readonly PreferredLine[]): PreferredLine[] {
  const seen = new Set<string>()
  const result: PreferredLine[] = []
  for (const line of lines) {
    const name = line.name.trim()
    const key = lineKey(name)
    if (name === '' || seen.has(key)) continue
    seen.add(key)
    result.push({ name, mode: line.mode })
  }
  return result
}
