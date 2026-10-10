import { describe, expect, it } from 'vitest'

import { InvalidShareCodeError } from '@/application/ports/route-codec'
import type { Route } from '@/domain/route'
import { minutes } from '@/domain/time'
import { busLine, gym, home, office, route, trainLine } from '@/test/builders'

import { CompressedRouteCodec } from './compressed-route-codec'

const codec = new CompressedRouteCodec()

const zurich = {
  name: 'Büro',
  stop: {
    id: '8503000',
    name: 'Zürich HB',
    coordinates: { latitude: 47.3781765, longitude: 8.5401932 },
  },
  walk: minutes(7),
  reserve: minutes(2),
}

const routes: Route[] = [
  route('commute-1', 'Commute', [home, office], [trainLine('S1'), busLine('20')]),
  route('zurich-22', 'Zuhause ↔ Büro', [gym, zurich], [{ name: 'IC 1', mode: 'train' }]),
  route('ferry', 'Ferry', [office, gym], [{ name: 'BAT', mode: 'ship' }]),
]

/** Deflates and encodes arbitrary text like the codec does, to build malformed codes. */
async function encodeRaw(text: string): Promise<string> {
  const stream = new Blob([new TextEncoder().encode(text)])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'))
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

describe('CompressedRouteCodec', () => {
  it('restores the routes it encoded', async () => {
    const decoded = await codec.decode(await codec.encode(routes))

    expect(decoded).toEqual([
      routes[0],
      {
        ...routes[1],
        places: [
          gym,
          {
            ...zurich,
            stop: { ...zurich.stop, coordinates: { latitude: 47.37818, longitude: 8.54019 } },
          },
        ],
      },
      routes[2],
    ])
  })

  it('writes short codes with characters that are safe in links', async () => {
    const code = await codec.encode(routes)

    expect(code).toMatch(/^[\w-]+$/)
    expect(code.length).toBeLessThan(400)
  })

  it('accepts codes with surrounding spaces', async () => {
    const code = await codec.encode(routes)

    expect(await codec.decode(`  ${code}\n`)).toHaveLength(3)
  })

  it.each([
    ['empty', ''],
    ['not base64', '!!!'],
    ['not deflated', 'aGVsbG8'],
    ['too long', 'a'.repeat(8_001)],
  ])('rejects a code that is %s', async (_reason, code) => {
    await expect(codec.decode(code)).rejects.toThrow(InvalidShareCodeError)
  })

  it('rejects truncated codes', async () => {
    const code = await codec.encode(routes)

    await expect(codec.decode(code.slice(0, -12))).rejects.toThrow(InvalidShareCodeError)
  })

  it('rejects other versions and unexpected content', async () => {
    const codes = await Promise.all([
      encodeRaw('[2]'),
      encodeRaw('{"routes":[]}'),
      encodeRaw('[1,["id","name"]]'),
      encodeRaw('[1,["id","n",["a","1","A",5,3,null,null],["b","2","B",-1,3,null,null],[]]]'),
      encodeRaw(
        '[1,["id","n",["a","1","A",5,3,null,null],["b","2","B",5,3,null,null],[["S1",9]]]]',
      ),
    ])

    for (const code of codes) {
      await expect(codec.decode(code)).rejects.toThrow(InvalidShareCodeError)
    }
  })

  it('stops reading content that inflates beyond the size of routes', async () => {
    const code = await encodeRaw(`[1,"${' '.repeat(200_000)}"]`)

    expect(code.length).toBeLessThan(8_000)
    await expect(codec.decode(code)).rejects.toThrow(InvalidShareCodeError)
  })
})
