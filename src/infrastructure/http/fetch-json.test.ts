import { describe, expect, it, vi } from 'vitest'

import { fetchJson } from './fetch-json'

const URL_ = 'https://example.org/data'

const answer = (response: Response) => vi.fn<typeof fetch>(() => Promise.resolve(response))

describe('fetchJson', () => {
  it('returns the parsed body', async () => {
    const fetch = answer(Response.json({ ok: true }))

    expect(await fetchJson(URL_, { fetch, timeout: 1000 })).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledWith(URL_, expect.objectContaining({ signal: expect.anything() }))
  })

  it.each([
    ['an error status', new Response('', { status: 503 }), 'http'],
    ['malformed JSON', new Response('{'), 'invalid-response'],
  ])('reports %s', async (_case, response, reason) => {
    await expect(fetchJson(URL_, { fetch: answer(response), timeout: 1000 })).rejects.toMatchObject(
      { name: 'HttpError', reason },
    )
  })

  it('reports network failures', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() => Promise.reject(new TypeError('offline')))

    await expect(fetchJson(URL_, { fetch, timeout: 1000 })).rejects.toMatchObject({
      reason: 'network',
    })
  })

  it('gives up after the timeout', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason as Error)
          })
        }),
    )

    await expect(fetchJson(URL_, { fetch, timeout: 10 })).rejects.toMatchObject({
      reason: 'timeout',
    })
  })

  it('passes aborts requested by the caller through', async () => {
    const controller = new AbortController()
    const abort = new DOMException('Stopped', 'AbortError')
    const fetch = vi.fn<typeof globalThis.fetch>(() => {
      controller.abort(abort)
      return Promise.reject(abort)
    })

    await expect(fetchJson(URL_, { fetch, timeout: 1000, signal: controller.signal })).rejects.toBe(
      abort,
    )
  })
})
