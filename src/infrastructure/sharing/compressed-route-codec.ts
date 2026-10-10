import * as v from 'valibot'

import { InvalidShareCodeError, type RouteCodec } from '@/application/ports/route-codec'
import type { TransportMode } from '@/domain/journey'
import type { Place, PreferredLine, Route } from '@/domain/route'
import { MINUTE } from '@/domain/time'

// A share code is deflated JSON in base64url. The JSON uses arrays instead of objects to keep
// links and QR codes small:
//
//   [version, route, ...]
//   route = [id, name, place, place, [[line, mode], ...]]
//   place = [name, stop id, stop name, walk minutes, reserve minutes, latitude, longitude]

const VERSION = 1
const MODES: readonly TransportMode[] = ['train', 'tram', 'bus', 'ship', 'cableway', 'other']

/** Limits for codes from unknown sources: their length and the size of their content. */
const MAX_CODE_LENGTH = 8_000
const MAX_CONTENT_BYTES = 64_000

const Text = v.pipe(v.string(), v.maxLength(200))
const Minutes = v.pipe(v.number(), v.integer(), v.minValue(0))

const PlaceSchema = v.tuple([
  Text,
  Text,
  Text,
  Minutes,
  Minutes,
  v.nullable(v.number()),
  v.nullable(v.number()),
])
const LineSchema = v.tuple([
  Text,
  v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(MODES.length - 1)),
])
const RouteSchema = v.tuple([Text, Text, PlaceSchema, PlaceSchema, v.array(LineSchema)])
const ShareSchema = v.pipe(v.tupleWithRest([v.literal(VERSION)], RouteSchema), v.maxLength(51))

type CompactPlace = v.InferOutput<typeof PlaceSchema>
type CompactRoute = v.InferOutput<typeof RouteSchema>

const round = (degrees: number): number => Math.round(degrees * 1e5) / 1e5

function compactPlace({ name, stop, walk, reserve }: Place): CompactPlace {
  const position = stop.coordinates
  return [
    name,
    stop.id,
    stop.name,
    Math.round(walk / MINUTE),
    Math.round(reserve / MINUTE),
    position ? round(position.latitude) : null,
    position ? round(position.longitude) : null,
  ]
}

function compact(route: Route): CompactRoute {
  return [
    route.id,
    route.name,
    compactPlace(route.places[0]),
    compactPlace(route.places[1]),
    route.preferredLines.map(({ name, mode }) => [name, MODES.indexOf(mode)]),
  ]
}

function expandPlace([
  name,
  id,
  stopName,
  walk,
  reserve,
  latitude,
  longitude,
]: CompactPlace): Place {
  const coordinates = latitude !== null && longitude !== null ? { latitude, longitude } : undefined
  return {
    name,
    stop: { id, name: stopName, ...(coordinates && { coordinates }) },
    walk: walk * MINUTE,
    reserve: reserve * MINUTE,
  }
}

function expand([id, name, first, second, lines]: CompactRoute): Route {
  return {
    id,
    name,
    places: [expandPlace(first), expandPlace(second)],
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
      const [, ...routes] = v.parse(ShareSchema, JSON.parse(json))
      return routes.map(expand)
    } catch (error) {
      throw new InvalidShareCodeError('The share code is damaged or incomplete.', { cause: error })
    }
  }
}
