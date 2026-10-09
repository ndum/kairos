import type { LocationPort, LocationResult } from '@/application/ports/location'
import { type Duration, MINUTE, SECOND } from '@/domain/time'

export interface BrowserLocationOptions {
  readonly geolocation?: Pick<Geolocation, 'getCurrentPosition'>
  readonly timeout?: Duration
  /** A position of up to this age is good enough to tell which place the user is at. */
  readonly maximumAge?: Duration
}

/** Reads the position with the Geolocation API, coarse and cached to save battery. */
export class BrowserLocation implements LocationPort {
  readonly #geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined
  readonly #timeout: Duration
  readonly #maximumAge: Duration

  constructor(options: BrowserLocationOptions = {}) {
    this.#geolocation =
      'geolocation' in options
        ? options.geolocation
        : typeof navigator === 'undefined'
          ? undefined
          : navigator.geolocation
    this.#timeout = options.timeout ?? 10 * SECOND
    this.#maximumAge = options.maximumAge ?? 5 * MINUTE
  }

  current(): Promise<LocationResult> {
    const geolocation = this.#geolocation
    if (!geolocation) return Promise.resolve({ kind: 'unavailable' })

    return new Promise((resolve) => {
      geolocation.getCurrentPosition(
        ({ coords }) => {
          resolve({
            kind: 'found',
            coordinates: { latitude: coords.latitude, longitude: coords.longitude },
          })
        },
        (error) => {
          resolve({ kind: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' })
        },
        { enableHighAccuracy: false, timeout: this.#timeout, maximumAge: this.#maximumAge },
      )
    })
  }
}
