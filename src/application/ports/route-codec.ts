import type { Route } from '@/domain/route'

/** Turns routes into compact text for share links and QR codes, and back. */
export interface RouteCodec {
  encode(routes: readonly Route[]): Promise<string>
  /** Throws an InvalidShareCodeError for text that is not a complete share code. */
  decode(text: string): Promise<Route[]>
}

export class InvalidShareCodeError extends Error {
  override readonly name = 'InvalidShareCodeError'
}
