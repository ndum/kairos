import * as v from 'valibot'

import type { FoundPlace, PlaceSearchPort } from '@/application/ports/place-search'
import { type Duration, SECOND } from '@/domain/time'

import { HttpError, fetchJson } from '../http/fetch-json'

const DEFAULT_BASE_URL = 'https://api3.geo.admin.ch/rest/services/api'
const DEFAULT_TIMEOUT: Duration = 8 * SECOND
const LIMIT = 6

const SearchResponseSchema = v.object({
  results: v.array(
    v.object({
      attrs: v.object({
        label: v.string(),
        lat: v.number(),
        lon: v.number(),
      }),
    }),
  ),
})

/** The labels mark the postcode and town in bold: "Messeplatz 1 <b>4058 Basel</b>". */
export const addressName = (label: string): string =>
  label
    .replace(/\s*<b>/g, ', ')
    .replaceAll('</b>', '')
    .replace(/^,\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()

export interface SwisstopoOptions {
  readonly baseUrl?: string
  readonly timeout?: Duration
  readonly fetch?: typeof globalThis.fetch
}

/**
 * Finds street addresses in Switzerland with the search service of swisstopo
 * (api3.geo.admin.ch), which needs no key and allows about 40 searches a minute.
 */
export class SwisstopoAddressSearch implements PlaceSearchPort {
  readonly #baseUrl: string
  readonly #timeout: Duration
  readonly #fetch: typeof globalThis.fetch

  constructor(options: SwisstopoOptions = {}) {
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.#timeout = options.timeout ?? DEFAULT_TIMEOUT
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  async searchPlaces(text: string, signal?: AbortSignal): Promise<FoundPlace[]> {
    const params = new URLSearchParams({
      searchText: text,
      type: 'locations',
      origins: 'address',
      sr: '4326',
      limit: String(LIMIT),
    })
    const body = await fetchJson(`${this.#baseUrl}/SearchServer?${params.toString()}`, {
      fetch: this.#fetch,
      timeout: this.#timeout,
      signal,
    })

    const result = v.safeParse(SearchResponseSchema, body)
    if (!result.success) {
      throw new HttpError(
        'invalid-response',
        `Unexpected address data: ${v.summarize(result.issues)}`,
      )
    }
    return result.output.results.map(({ attrs }) => ({
      name: addressName(attrs.label),
      kind: 'address',
      coordinates: { latitude: attrs.lat, longitude: attrs.lon },
    }))
  }
}
