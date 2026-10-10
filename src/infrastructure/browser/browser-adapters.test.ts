import { afterEach, describe, expect, it, vi } from 'vitest'

import { randomId } from './random-id'
import { systemClock } from './system-clock'
import { timerScheduler } from './timer-scheduler'

afterEach(() => {
  vi.useRealTimers()
})

describe('systemClock', () => {
  it('reads the current time', () => {
    vi.useFakeTimers({ now: Date.parse('2026-10-12T07:00:00+02:00') })

    expect(systemClock.now()).toBe(Date.parse('2026-10-12T07:00:00+02:00'))
  })
})

describe('timerScheduler', () => {
  it('runs a task after the delay', () => {
    vi.useFakeTimers()
    const task = vi.fn()

    timerScheduler.after(1000, task)
    vi.advanceTimersByTime(999)
    expect(task).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)

    expect(task).toHaveBeenCalledOnce()
  })

  it('does not run a cancelled task', () => {
    vi.useFakeTimers()
    const task = vi.fn()

    const cancel = timerScheduler.after(1000, task)
    cancel()
    vi.advanceTimersByTime(1000)

    expect(task).not.toHaveBeenCalled()
  })
})

describe('randomId', () => {
  it('creates short ids from an unambiguous alphabet', () => {
    const ids = Array.from({ length: 200 }, randomId)

    expect(ids.every((id) => /^[0-9a-hjkmnp-tv-z]{12}$/.test(id))).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
