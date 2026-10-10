import type { Scheduler } from '@/application/ports/scheduler'

export const timerScheduler: Scheduler = {
  after(delay, task) {
    const handle = setTimeout(task, delay)
    return () => {
      clearTimeout(handle)
    }
  },
}
