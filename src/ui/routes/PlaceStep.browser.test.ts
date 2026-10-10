import { afterEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, ref } from 'vue'

import type { FoundPlace } from '@/application/ports/place-search'
import type { StopRef } from '@/domain/route'
import { type RenderOptions, renderWithApp } from '@/test/render'

import PlaceStep from './PlaceStep.vue'
import { type PlaceForm, emptyPlace } from './route-form'

/** Renders the step with a form and shows the stored place below it. */
const Harness = defineComponent(() => {
  const place = ref<PlaceForm>(emptyPlace())
  return () => [
    h(PlaceStep, { modelValue: place.value, end: 'origin', errors: {} }),
    h('output', { 'data-testid': 'position' }, JSON.stringify(place.value.coordinates ?? null)),
    h('output', { 'data-testid': 'stop' }, place.value.stop?.name ?? 'none'),
    h('output', { 'data-testid': 'walk' }, String(place.value.walk)),
  ]
})

const home = { latitude: 47.48607, longitude: 7.73068 }

const address: FoundPlace = {
  name: 'Rheinstrasse 27, 4410 Liestal',
  kind: 'address',
  coordinates: home,
}

const stopAt = (name: string, latitude: number, longitude: number): StopRef => ({
  id: name,
  name,
  coordinates: { latitude, longitude },
})

// About 190, 120 and 540 meters from home.
const station = stopAt('Liestal', 47.48446, 7.73137)
const hospital = stopAt('Liestal, Kantonsspital', 47.48717, 7.73052)
const oris = stopAt('Liestal, Oris', 47.48125, 7.73099)

function setup(options: RenderOptions = {}) {
  return renderWithApp(Harness, {
    addresses: { searchPlaces: () => Promise.resolve([address]) },
    location: { kind: 'found', coordinates: home },
    ...options,
    timetable: {
      stopsNear: () => Promise.resolve([station, hospital]),
      searchStops: () => Promise.resolve([oris]),
    },
  })
}

afterEach(() => {
  localStorage.clear()
})

test('suggests the stops near an address and takes the walk to the chosen one', async () => {
  const screen = await setup()

  await userEvent.fill(
    screen.getByRole('combobox', { name: 'Adresse oder Firma' }),
    'Rheinstrasse 27',
  )
  await screen.getByRole('option', { name: 'Rheinstrasse 27, 4410 Liestal' }).click()

  await expect.element(screen.getByTestId('position')).toHaveTextContent(JSON.stringify(home))
  await expect.element(screen.getByText('120 m, etwa 2 Min. zu Fuss')).toBeVisible()
  await screen.getByRole('radio', { name: /^Liestal\s?190 m/ }).click()

  await expect.element(screen.getByTestId('stop')).toHaveTextContent('Liestal')
  await expect.element(screen.getByTestId('walk')).toHaveTextContent('4')
})

test('takes the current position and removes it again', async () => {
  const screen = await setup()

  await screen.getByRole('button', { name: 'Aktuellen Standort verwenden' }).click()

  await expect.element(screen.getByText('Standort übernommen.')).toBeVisible()
  await expect.element(screen.getByTestId('position')).toHaveTextContent(JSON.stringify(home))
  await expect.element(screen.getByRole('radio', { name: /Kantonsspital/ })).toBeVisible()

  await screen.getByRole('button', { name: 'Lage entfernen' }).click()
  await expect.element(screen.getByTestId('position')).toHaveTextContent('null')
  expect(screen.getByRole('radio').query()).toBeNull()
})

test('searches another stop by name and estimates the walk to it', async () => {
  const screen = await setup()

  await screen.getByRole('button', { name: 'Aktuellen Standort verwenden' }).click()
  await screen.getByRole('radio', { name: 'Andere Haltestelle' }).click()
  await userEvent.fill(screen.getByRole('combobox', { name: 'Haltestelle' }), 'Oris')
  await screen.getByRole('option', { name: 'Liestal, Oris' }).click()

  await expect.element(screen.getByTestId('stop')).toHaveTextContent('Liestal, Oris')
  await expect.element(screen.getByTestId('walk')).toHaveTextContent('9')
})

test('finds the stop by name while the position is unknown', async () => {
  const screen = await setup()

  await userEvent.fill(screen.getByRole('combobox', { name: 'Haltestelle' }), 'Oris')
  await screen.getByRole('option', { name: 'Liestal, Oris' }).click()

  await expect.element(screen.getByTestId('stop')).toHaveTextContent('Liestal, Oris')
  await expect.element(screen.getByTestId('walk')).toHaveTextContent('5')
})
