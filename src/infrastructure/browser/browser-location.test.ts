import { afterEach, describe, expect, it, vi } from 'vitest'

import { BrowserLocation } from './browser-location'

const PERMISSION_DENIED = 1
const POSITION_UNAVAILABLE = 2
const TIMEOUT = 3

const failure = (code: number) =>
  ({
    code,
    PERMISSION_DENIED,
    POSITION_UNAVAILABLE,
    TIMEOUT,
    message: '',
  }) as GeolocationPositionError

const position = (latitude: number, longitude: number) =>
  ({ coords: { latitude, longitude } }) as GeolocationPosition

type Answer = (found: PositionCallback, failed?: PositionErrorCallback | null) => void

/** A Geolocation API that gives the answers in turn, one per reading. */
function geolocation(...answers: Answer[]) {
  return {
    getCurrentPosition: vi.fn<Geolocation['getCurrentPosition']>((found, failed) => {
      answers.shift()?.(found, failed)
    }),
  }
}

const foundAt =
  (latitude: number, longitude: number): Answer =>
  (found) => {
    found(position(latitude, longitude))
  }

const failedWith =
  (code: number): Answer =>
  (_found, failed) => {
    failed?.(failure(code))
  }

const silent: Answer = () => undefined

afterEach(() => {
  vi.useRealTimers()
})

describe('BrowserLocation', () => {
  it('reports the position with coarse accuracy and a cached reading of up to five minutes', async () => {
    const api = geolocation(foundAt(47.56, 7.6))
    const location = new BrowserLocation({ geolocation: api })

    expect(await location.current()).toEqual({
      kind: 'found',
      coordinates: { latitude: 47.56, longitude: 7.6 },
    })
    expect(api.getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(api.getCurrentPosition.mock.calls[0]?.[2]).toEqual({
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 300_000,
    })
  })

  it.each([
    ['cannot find the position', POSITION_UNAVAILABLE],
    ['runs out of time', TIMEOUT],
  ])('reads precisely once more when the coarse reading %s', async (_reason, code) => {
    const api = geolocation(failedWith(code), foundAt(47.56, 7.6))

    expect(await new BrowserLocation({ geolocation: api }).current()).toMatchObject({
      kind: 'found',
    })
    expect(api.getCurrentPosition.mock.calls[1]?.[2]).toEqual({
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 300_000,
    })
  })

  it('tells a refused permission apart from a position that cannot be found', async () => {
    const refused = geolocation(failedWith(PERMISSION_DENIED))
    const lost = geolocation(failedWith(POSITION_UNAVAILABLE), failedWith(TIMEOUT))

    expect(await new BrowserLocation({ geolocation: refused }).current()).toEqual({
      kind: 'denied',
    })
    expect(refused.getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(await new BrowserLocation({ geolocation: lost }).current()).toEqual({
      kind: 'unavailable',
    })
  })

  it('stops waiting when the browser never answers', async () => {
    vi.useFakeTimers()
    const api = geolocation(silent)
    const answer = new BrowserLocation({ geolocation: api }).current()

    await vi.advanceTimersByTimeAsync(15_000)

    expect(await answer).toEqual({ kind: 'unavailable' })
    expect(api.getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('reports nothing without the Geolocation API', async () => {
    expect(await new BrowserLocation({ geolocation: undefined }).current()).toEqual({
      kind: 'unavailable',
    })
  })
})
