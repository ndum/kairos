import { describe, expect, it, vi } from 'vitest'

import { BrowserLocation } from './browser-location'

const PERMISSION_DENIED = 1
const TIMEOUT = 3

const failure = (code: number) =>
  ({
    code,
    PERMISSION_DENIED,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT,
    message: '',
  }) as GeolocationPositionError

const position = (latitude: number, longitude: number) =>
  ({ coords: { latitude, longitude } }) as GeolocationPosition

describe('BrowserLocation', () => {
  it('reports the position with coarse accuracy and a cached reading of up to five minutes', async () => {
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((found) => {
      found(position(46.8, 7.5))
    })
    const location = new BrowserLocation({ geolocation: { getCurrentPosition } })

    expect(await location.current()).toEqual({
      kind: 'found',
      coordinates: { latitude: 46.8, longitude: 7.5 },
    })
    expect(getCurrentPosition.mock.calls[0]?.[2]).toEqual({
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 300_000,
    })
  })

  it('tells a refused permission apart from a position that cannot be found', async () => {
    const answer = (code: number) =>
      new BrowserLocation({
        geolocation: {
          getCurrentPosition: (_found, failed) => {
            failed?.(failure(code))
          },
        },
      }).current()

    expect(await answer(PERMISSION_DENIED)).toEqual({ kind: 'denied' })
    expect(await answer(TIMEOUT)).toEqual({ kind: 'unavailable' })
  })

  it('reports nothing without the Geolocation API', async () => {
    expect(await new BrowserLocation({ geolocation: undefined }).current()).toEqual({
      kind: 'unavailable',
    })
  })
})
