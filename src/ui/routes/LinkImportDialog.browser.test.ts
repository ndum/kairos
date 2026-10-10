import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import { renderWithApp } from '@/test/render'

import LinkImportDialog from './LinkImportDialog.vue'

test('opens the import for a pasted link', async () => {
  const screen = await renderWithApp(LinkImportDialog, { props: { open: true } })

  await userEvent.fill(
    screen.getByRole('textbox', { name: 'Link' }),
    'https://kairos.ndum.ch/#/import?r=abc-123',
  )
  await screen.getByRole('button', { name: 'Weiter' }).click()

  await expect.poll(() => screen.router.currentRoute.value.fullPath).toBe('/import?r=abc-123')
})

test('rejects text that is not a link of Kairos', async () => {
  const screen = await renderWithApp(LinkImportDialog, { props: { open: true } })

  await userEvent.fill(screen.getByRole('textbox', { name: 'Link' }), 'https://example.com/')
  await screen.getByRole('button', { name: 'Weiter' }).click()

  await expect.element(screen.getByText('Das ist kein Link von Kairos.')).toBeVisible()
  expect(screen.router.currentRoute.value.name).toBe('now')
})
