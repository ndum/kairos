import * as v from 'valibot'

import { InvalidShareCodeError, type RouteCodec } from '@/application/ports/route-codec'
import type { TransportMode } from '@/domain/journey'
import type { Place, PlaceStop, PreferredLine, Route, StopRef } from '@/domain/route'
import { MINUTE } from '@/domain/time'

// A share code is deflated JSON in base64url. The JSON uses arrays instead of objects to keep
// links and QR codes small:
//
//   [version, route, ...]
//   route = [id, name, place, place, [[line, mode], ...], buffer minutes]
//   place = [name, stop id, stop name, walk minutes, latitude, longitude, second stop]
//   second stop = [stop id, stop name, walk minutes, latitude, longitude]
//
// The second stop was added later and is left out when a place has none, so older codes stay
// valid and older versions of the app ignore it.
//
// Codes of version 1 have no buffer on the route but a reserve in every place, after the walk
// minutes. They are still read, and the larger reserve becomes the buffer.

const VERSION = 2
const MODES: readonly TransportMode[] = ['train', 'tram', 'bus', 'ship', 'cableway', 'other']

/** Limits for codes from unknown sources: their length and the size of their content. */
const MAX_CODE_LENGTH = 8_000
const MAX_CONTENT_BYTES = 64_000

const Text = v.pipe(v.string(), v.maxLength(200))
const Minutes = v.pipe(v.number(), v.integer(), v.minValue(0))
const Degrees = v.nullable(v.number())
/** A code holds at most this many routes. */
const MAX_ROUTES = 50

const SecondStopSchema = v.tuple([Text, Text, Minutes, Degrees, Degrees])
const PlaceSchema = v.tuple([
  Text,
  Text,
  Text,
  Minutes,
  Degrees,
  Degrees,
  v.optional(SecondStopSchema),
])
const LineSchema = v.tuple([
  Text,
  v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(MODES.length - 1)),
])
const RouteSchema = v.tuple([Text, Text, PlaceSchema, PlaceSchema, v.array(LineSchema), Minutes])
const ShareSchema = v.pipe(
  v.tupleWithRest([v.literal(VERSION)], RouteSchema),
  v.maxLength(MAX_ROUTES + 1),
)

const PlaceV1Schema = v.tuple([Text, Text, Text, Minutes, Minutes, Degrees, Degrees])
const RouteV1Schema = v.tuple([Text, Text, PlaceV1Schema, PlaceV1Schema, v.array(LineSchema)])
const ShareV1Schema = v.pipe(
  v.tupleWithRest([v.literal(1)], RouteV1Schema),
  v.maxLength(MAX_ROUTES + 1),
)

type CompactPlace = v.InferOutput<typeof PlaceSchema>
type CompactRoute = v.InferOutput<typeof RouteSchema>
type CompactPlaceV1 = v.InferOutput<typeof PlaceV1Schema>
type CompactRouteV1 = v.InferOutput<typeof RouteV1Schema>

const round = (degrees: number): number => Math.round(degrees * 1e5) / 1e5

type CompactStop = v.InferOutput<typeof SecondStopSchema>

const positionOf = (stop: StopRef): [number | null, number | null] =>
  stop.coordinates
    ? [round(stop.coordinates.latitude), round(stop.coordinates.longitude)]
    : [null, null]

const compactStop = ({ stop, walk }: PlaceStop): CompactStop => [
  stop.id,
  stop.name,
  Math.round(walk / MINUTE),
  ...positionOf(stop),
]

function compactPlace({ name, stop, walk, secondStop }: Place): CompactPlace {
  // JSON would write a missing second stop as null, so the item is left out instead.
  return [
    name,
    stop.id,
    stop.name,
    Math.round(walk / MINUTE),
    ...positionOf(stop),
    ...(secondStop ? [compactStop(secondStop)] : []),
  ] as CompactPlace
}

function compact(route: Route): CompactRoute {
  return [
    route.id,
    route.name,
    compactPlace(route.places[0]),
    compactPlace(route.places[1]),
    route.preferredLines.map(({ name, mode }) => [name, MODES.indexOf(mode)]),
    Math.round(route.buffer / MINUTE),
  ]
}

const placeFromV1 = ([name, id, stopName, walk, , latitude, longitude]: CompactPlaceV1) =>
  [name, id, stopName, walk, latitude, longitude, undefined] satisfies CompactPlace

function fromV1([id, name, first, second, lines]: CompactRouteV1): CompactRoute {
  return [id, name, placeFromV1(first), placeFromV1(second), lines, Math.max(first[4], second[4])]
}

function expandStop(
  id: string,
  name: string,
  latitude: number | null,
  longitude: number | null,
): StopRef {
  const coordinates = latitude !== null && longitude !== null ? { latitude, longitude } : undefined
  return { id, name, ...(coordinates && { coordinates }) }
}

function expandPlace([name, id, stopName, walk, latitude, longitude, second]: CompactPlace): Place {
  return {
    name,
    stop: expandStop(id, stopName, latitude, longitude),
    walk: walk * MINUTE,
    ...(second && {
      secondStop: {
        stop: expandStop(second[0], second[1], second[3], second[4]),
        walk: second[2] * MINUTE,
      },
    }),
  }
}

function expand([id, name, first, second, lines, buffer]: CompactRoute): Route {
  return {
    id,
    name,
    places: [expandPlace(first), expandPlace(second)],
    buffer: buffer * MINUTE,
    preferredLines: lines.map(([line, mode]): PreferredLine => ({
      name: line,
      mode: MODES[mode] ?? 'other',
    })),
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function compress(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Stops reading at the limit, so a small code cannot inflate into a huge amount of data. */
async function decompress(bytes: Uint8Array<ArrayBuffer>, limit: number): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader()
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text
    text += value
    if (text.length > limit) {
      await reader.cancel()
      throw new Error('The share code holds more data than routes can have.')
    }
  }
}

/** Share codes made of deflated, compact JSON, written with URL-safe characters. */
export class CompressedRouteCodec implements RouteCodec {
  async encode(routes: readonly Route[]): Promise<string> {
    const json = JSON.stringify([VERSION, ...routes.map(compact)])
    return toBase64Url(await compress(new TextEncoder().encode(json)))
  }

  async decode(text: string): Promise<Route[]> {
    const code = text.trim()
    if (code.length === 0 || code.length > MAX_CODE_LENGTH) {
      throw new InvalidShareCodeError('The share code is empty or too long.')
    }
    try {
      const json = await decompress(fromBase64Url(code), MAX_CONTENT_BYTES)
      const data: unknown = JSON.parse(json)
      const current = v.safeParse(ShareSchema, data)
      if (current.success) {
        const [, ...routes] = current.output
        return routes.map(expand)
      }
      const [, ...routes] = v.parse(ShareV1Schema, data)
      return routes.map((route) => expand(fromV1(route)))
    } catch (error) {
      throw new InvalidShareCodeError('The share code is damaged or incomplete.', { cause: error })
    }
  }
}
