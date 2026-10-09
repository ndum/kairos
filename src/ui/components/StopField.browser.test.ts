import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, ref } from 'vue'

import type { StopRef } from '@/domain/route'
import { stop } from '@/test/builders'
import { renderWithApp } from '@/test/render'

import StopField from './StopField.vue'

const stops = [stop('Thun'), stop('Thun, Bahnhof'), stop('Thun, Postbrücke')]

/** Renders the field with a model and shows the chosen stop below it. */
const Harness = defineComponent(() => {
  const chosen = ref<StopRef | null>(null)
  return () => [
    h(StopField, {
      label: 'Haltestelle',
      modelValue: chosen.value,
      'onUpdate:modelValue': (value: StopRef | null) => {
        chosen.value = value
      },
    }),
    h('output', { 'data-testid': 'chosen' }, chosen.value?.name ?? 'none'),
  ]
})

function setup(searchStops = () => Promise.resolve(stops)) {
  return renderWithApp(Harness, { timetable: { searchStops } })
}

test('offers the stops found and takes the highlighted one with Enter', async () => {
  const screen = await setup()
  const field = screen.getByRole('combobox', { name: 'Haltestelle' })

  await userEvent.fill(field, 'Thun')
  await expect.element(screen.getByRole('option', { name: 'Thun, Bahnhof' })).toBeVisible()
  await expect
    .element(screen.getByRole('option', { name: 'Thun', exact: true }))
    .toHaveAttribute('aria-selected', 'true')

  await userEvent.keyboard('{ArrowDown}{Enter}')

  await expect.element(screen.getByTestId('chosen')).toHaveTextContent('Thun, Bahnhof')
  await expect.element(field).toHaveValue('Thun, Bahnhof')
  await expect.element(field).toHaveAttribute('aria-expanded', 'false')
})

test('takes a stop with a click and forgets it when the text changes', async () => {
  const screen = await setup()
  const field = screen.getByRole('combobox', { name: 'Haltestelle' })

  await userEvent.fill(field, 'Thu')
  await screen.getByRole('option', { name: 'Thun, Postbrücke' }).click()
  await expect.element(screen.getByTestId('chosen')).toHaveTextContent('Thun, Postbrücke')

  await userEvent.type(field, 'x')
  await expect.element(screen.getByTestId('chosen')).toHaveTextContent('none')
})

test('tells the user when nothing is found or the search fails', async () => {
  let fail = false
  const screen = await setup(() =>
    fail ? Promise.reject(new Error('Offline')) : Promise.resolve([]),
  )
  const field = screen.getByRole('combobox', { name: 'Haltestelle' })

  await userEvent.fill(field, 'Atlantis')
  await expect.element(screen.getByText('Keine Haltestelle gefunden.')).toBeVisible()

  fail = true
  await userEvent.fill(field, 'Lemuria')
  await expect.element(screen.getByText(/Die Suche ist gerade nicht möglich/)).toBeVisible()
})
