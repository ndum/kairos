import { describe, expect, it } from 'vitest'

import { MINUTE, SECOND } from '@/domain/time'

import {
  OFFSTAGE_LEFT,
  OFFSTAGE_RIGHT,
  STATION_X,
  TRAIN_LENGTH,
  isTrainMoving,
  trainOffset,
} from './train-motion'

const departure = Date.parse('2026-10-12T07:05:00+02:00')
const parked = STATION_X - TRAIN_LENGTH

describe('trainOffset', () => {
  it('keeps the train out of sight without a departure or long before it', () => {
    expect(trainOffset(null, departure)).toBe(OFFSTAGE_LEFT)
    expect(trainOffset(departure, departure - 10 * MINUTE)).toBe(OFFSTAGE_LEFT)
  })

  it('rolls the train in during the last minutes', () => {
    const early = trainOffset(departure, departure - 8 * MINUTE)
    const late = trainOffset(departure, departure - 2 * MINUTE)

    expect(early).toBeGreaterThan(OFFSTAGE_LEFT)
    expect(late).toBeGreaterThan(early)
    expect(late).toBeLessThan(parked)
  })

  it('waits at the platform shortly before the departure', () => {
    expect(trainOffset(departure, departure - 30 * SECOND)).toBe(parked)
  })

  it('pulls out after the departure', () => {
    expect(trainOffset(departure, departure + 70 * SECOND)).toBeGreaterThan(parked)
    expect(trainOffset(departure, departure + 5 * MINUTE)).toBe(OFFSTAGE_RIGHT)
  })
})

describe('isTrainMoving', () => {
  it('is true only while the train rolls in or pulls out', () => {
    expect(isTrainMoving(null, departure)).toBe(false)
    expect(isTrainMoving(departure, departure - 10 * MINUTE)).toBe(false)
    expect(isTrainMoving(departure, departure - 5 * MINUTE)).toBe(true)
    expect(isTrainMoving(departure, departure - 20 * SECOND)).toBe(false)
    expect(isTrainMoving(departure, departure + MINUTE)).toBe(true)
    expect(isTrainMoving(departure, departure + 5 * MINUTE)).toBe(false)
  })
})
