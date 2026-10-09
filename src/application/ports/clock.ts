import type { Instant } from '@/domain/time'

export interface Clock {
  now(): Instant
}
