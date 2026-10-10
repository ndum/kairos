import { expect, test } from 'vitest'

import { planTrip } from '@/domain/trip'
import { commute, journey, ride } from '@/test/builders'
import { renderWithApp } from '@/test/render'

import TripTimeline from './TripTimeline.vue'

const trip = planTrip(
  journey(
    ride('IR 37', 'Riverside', '07:05', 'Market Square', '07:30', {
      platform: '4',
      tripNumber: '2254',
      operator: 'SBB',
      stopovers: [
        ['Mill Lane', '07:11'],
        ['Central', '07:20'],
      ],
    }),
  ),
  commute,
)
if (!trip) throw new Error('Expected a trip')

test('names the train and its operator', async () => {
  const screen = await renderWithApp(TripTimeline, { props: { trip, ends: commute } })

  await expect.element(screen.getByText('Zug 2254, SBB')).toBeVisible()
})

test('folds the stops in between until the user opens them', async () => {
  const screen = await renderWithApp(TripTimeline, { props: { trip, ends: commute } })

  const stopovers = screen.getByText('2 Zwischenhalte')
  await expect.element(stopovers).toBeVisible()
  await expect.element(screen.getByText('Mill Lane')).not.toBeVisible()

  await stopovers.click()

  await expect.element(screen.getByText('Mill Lane')).toBeVisible()
  await expect.element(screen.getByText('07:20')).toBeVisible()
})

test('names only the operator for vehicles other than trains', async () => {
  const tramTrip = planTrip(
    journey(
      ride('1', 'Riverside', '07:05', 'Market Square', '07:30', {
        mode: 'tram',
        tripNumber: '1041',
        operator: 'BVB',
      }),
    ),
    commute,
  )
  if (!tramTrip) throw new Error('Expected a trip')
  const screen = await renderWithApp(TripTimeline, { props: { trip: tramTrip, ends: commute } })

  await expect.element(screen.getByText('BVB', { exact: true })).toBeVisible()
  expect(screen.getByText(/1041/).query()).toBeNull()
  expect(screen.getByText(/Zwischenhalt/).query()).toBeNull()
})
