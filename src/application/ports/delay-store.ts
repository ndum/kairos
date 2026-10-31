import type { DelayRecord } from '@/domain/punctuality'

/** Keeps the delays of the user's rides on the device. Losing them is no harm. */
export interface DelayStore {
  load(): DelayRecord[]
  save(records: readonly DelayRecord[]): void
}
