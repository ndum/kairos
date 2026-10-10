import type { LocationPort, LocationResult } from '@/application/ports/location'
import { type Duration, MINUTE, SECOND } from '@/domain/time'

export interface BrowserLocationOptions {
  readonly geolocation?: Pick<Geolocation, 'getCurrentPosition'>
  /** How long the coarse reading may take. The precise one may take twice as long. */
  readonly timeout?: Duration
  /** A position of up to this age is good enough to tell which place the user is at. */
  readonly maximumAge?: Duration
  /** Extra time to wait for any answer, as some browsers never report their timeout. */
  readonly grace?: Duration
}

/** A reading without any answer from the browser, which a second attempt would not change. */
type Reading = LocationResult | { readonly kind: 'silent' }

/**
 * Reads the position with the Geolocation API. A coarse and cached reading saves battery. If
 * the browser cannot find the position that way, one precise reading follows.
 */
export class BrowserLocation implements LocationPort {
  readonly #geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined
  readonly #timeout: Duration
  readonly #maximumAge: Duration
  readonly #grace: Duration

  constructor(options: BrowserLocationOptions = {}) {
    this.#geolocation =
      'geolocation' in options
        ? options.geolocation
        : typeof navigator === 'undefined'
          ? undefined
          : navigator.geolocation
    this.#timeout = options.timeout ?? 10 * SECOND
    this.#maximumAge = options.maximumAge ?? 5 * MINUTE
    this.#grace = options.grace ?? 5 * SECOND
  }

  async current(): Promise<LocationResult> {
    const geolocation = this.#geolocation
    if (!geolocation) return { kind: 'unavailable' }

    let reading = await this.#read(geolocation, {
      enableHighAccuracy: false,
      timeout: this.#timeout,
      maximumAge: this.#maximumAge,
    })
    if (reading.kind === 'unavailable') {
      reading = await this.#read(geolocation, {
        enableHighAccuracy: true,
        timeout: 2 * this.#timeout,
        maximumAge: this.#maximumAge,
      })
    }
    return reading.kind === 'silent' ? { kind: 'unavailable' } : reading
  }

  #read(
    geolocation: Pick<Geolocation, 'getCurrentPosition'>,
    options: PositionOptions & { timeout: Duration },
  ): Promise<Reading> {
    return new Promise((resolve) => {
      // An installed app on iOS may wait for a permission prompt that never shows.
      const timer = setTimeout(() => {
        resolve({ kind: 'silent' })
      }, options.timeout + this.#grace)
      geolocation.getCurrentPosition(
        ({ coords }) => {
          clearTimeout(timer)
          resolve({
            kind: 'found',
            coordinates: { latitude: coords.latitude, longitude: coords.longitude },
          })
        },
        (error) => {
          clearTimeout(timer)
          resolve({ kind: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' })
        },
        options,
      )
    })
  }
}
