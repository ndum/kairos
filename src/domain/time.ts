/** Milliseconds since the Unix epoch. */
export type Instant = number

/** A span of time in milliseconds. */
export type Duration = number

export const SECOND: Duration = 1000
export const MINUTE: Duration = 60 * SECOND
export const HOUR: Duration = 60 * MINUTE

export const minutes = (count: number): Duration => count * MINUTE
