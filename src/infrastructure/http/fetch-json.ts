import type { Duration } from '@/domain/time'

export type HttpFailure = 'network' | 'timeout' | 'http' | 'invalid-response'

/** A request that failed. Aborts requested by the caller are rethrown unchanged instead. */
export class HttpError extends Error {
  override readonly name = 'HttpError'

  constructor(
    readonly reason: HttpFailure,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

export interface FetchJsonOptions {
  readonly fetch: typeof globalThis.fetch
  readonly timeout: Duration
  readonly signal?: AbortSignal | undefined
}

/** Gets JSON with a timeout of its own and tells network, timeout and server failures apart. */
export async function fetchJson(url: string, options: FetchJsonOptions): Promise<unknown> {
  const { host } = new URL(url)
  const timeout = AbortSignal.timeout(options.timeout)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  let response: Response
  try {
    response = await options.fetch(url, { signal })
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (timeout.aborted) {
      throw new HttpError('timeout', `${host} did not respond in time.`, { cause: error })
    }
    throw new HttpError('network', `${host} could not be reached.`, { cause: error })
  }

  if (!response.ok) {
    throw new HttpError('http', `${host} answered with status ${response.status}.`)
  }
  try {
    return await response.json()
  } catch (error) {
    throw new HttpError('invalid-response', `${host} sent malformed data.`, { cause: error })
  }
}
