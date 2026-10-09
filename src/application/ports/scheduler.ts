import type { Duration } from '@/domain/time'

/** Cancels a scheduled task. Calling it after the task has run does nothing. */
export type Cancel = () => void

export interface Scheduler {
  after(delay: Duration, task: () => void): Cancel
}
