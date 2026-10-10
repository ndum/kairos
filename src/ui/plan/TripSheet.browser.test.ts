import { afterEach, expect, test, vi } from 'vitest'

import { planTrip } from '@/domain/trip'
import { ends, home, morningCommute, office } from '@/test/builders'
import { renderWithApp } from '@/test/render'

import { useToastStore } from '../stores/toasts'
import TripSheet from './TripSheet.vue'

const way = ends(home, office)

// The S1 leaves Riverside at 07:20, the bus 20 takes over at 07:34 and arrives at 07:38.
async function renderSheet() {
  const trip = planTrip(morningCommute('07:20', { platform: '3' }), way)
  if (!trip) throw new Error('Expected a trip')
  return renderWithApp(TripSheet, { props: { open: true, trip, ends: way, pinned: false } })
}

const sharedText = [
  'Home → Office',
  'Losgehen um 07:09',
  '07:20 S1 ab Riverside, Gleis 3',
  '07:34 Bus 20 ab Central, Bus Station',
  'Ankunft Office um 07:43',
].join('\n')

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'share')
})

test('shares the trip as text through the share menu of the device', async () => {
  const share = vi.fn(() => Promise.resolve())
  Object.defineProperty(navigator, 'share', { configurable: true, value: share })
  const screen = await renderSheet()

  await screen.getByRole('button', { name: 'Teilen' }).click()

  await expect.poll(() => share.mock.calls.length).toBe(1)
  expect(share).toHaveBeenCalledWith({ title: 'Home → Office', text: sharedText })
})

test('copies the trip when the device cannot share it', async () => {
  const share = vi.fn(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')))
  Object.defineProperty(navigator, 'share', { configurable: true, value: share })
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  const screen = await renderSheet()

  await screen.getByRole('button', { name: 'Teilen' }).click()

  await expect.poll(() => useToastStore().current?.message).toBe('Fahrt kopiert.')
  expect(writeText).toHaveBeenCalledWith(sharedText)
})

test('adds the trip to the calendar with a reminder at the leave time', async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const createObjectURL = vi.spyOn(URL, 'createObjectURL')
  const screen = await renderSheet()

  await screen.getByRole('button', { name: 'Zum Kalender' }).click()

  expect(click).toHaveBeenCalledOnce()
  expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('kairos-2026-10-12-0709.ics')
  const file = createObjectURL.mock.calls[0]?.[0]
  if (!(file instanceof Blob)) throw new Error('Expected a file')
  const content = await file.text()
  expect(content).toContain('DTSTART:20261012T050900Z')
  expect(content).toContain('SUMMARY:Home → Office')
  expect(content).toContain('LOCATION:Riverside')
  expect(content).toContain('DESCRIPTION:Losgehen nach Office')
})
