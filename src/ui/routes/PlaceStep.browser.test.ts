import { afterEach, expect, test } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import { renderWithApp } from '@/test/render'

import PlaceStep from './PlaceStep.vue'
import { type PlaceForm, emptyPlace } from './route-form'

/** Renders the step with a form and shows the stored position below it. */
const Harness = defineComponent(() => {
  const place = ref<PlaceForm>(emptyPlace())
  return () => [
    h(PlaceStep, { modelValue: place.value, end: 'origin', errors: {} }),
    h('output', { 'data-testid': 'position' }, JSON.stringify(place.value.coordinates ?? null)),
  ]
})

const position = { latitude: 46.802, longitude: 7.503 }

afterEach(() => {
  localStorage.clear()
})

test('offers the position of the place only with the direction by location', async () => {
  const screen = await renderWithApp(Harness, {
    location: { kind: 'found', coordinates: position },
  })

  await expect.element(screen.getByRole('textbox', { name: 'Name des Ortes' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Aktuellen Standort verwenden' }).query()).toBeNull()
})

test('stores the current position for the place and removes it again', async () => {
  localStorage.setItem('kairos:location', 'true')
  const screen = await renderWithApp(Harness, {
    location: { kind: 'found', coordinates: position },
  })

  await screen.getByRole('button', { name: 'Aktuellen Standort verwenden' }).click()

  await expect.element(screen.getByText('Standort gespeichert.')).toBeVisible()
  await expect.element(screen.getByTestId('position')).toHaveTextContent(JSON.stringify(position))

  await screen.getByRole('button', { name: 'Standort entfernen' }).click()
  await expect.element(screen.getByTestId('position')).toHaveTextContent('null')
})
