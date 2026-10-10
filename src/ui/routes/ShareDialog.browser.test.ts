import { afterEach, expect, test, vi } from 'vitest'

import { forSharing } from '@/application/route-sharing'
import { CompressedRouteCodec } from '@/infrastructure/sharing/compressed-route-codec'
import { home, office, route } from '@/test/builders'
import { renderWithApp } from '@/test/render'

import { shareCodeFrom } from './share-link'
import ShareDialog from './ShareDialog.vue'

const commute = route('commute', 'Commute', [
  { ...home, coordinates: { latitude: 47.4845, longitude: 7.7314 } },
  office,
])

afterEach(() => {
  vi.restoreAllMocks()
})

async function open() {
  const screen = await renderWithApp(ShareDialog, { props: { open: true, routes: [commute] } })
  const field = screen.getByRole('textbox', { name: 'Link' })
  await expect.element(field).toHaveValue(expect.stringContaining('/import?r=') as string)
  return { screen, field }
}

test('offers a link and a QR code with the routes, without positions of places', async () => {
  const { screen, field } = await open()

  const code = shareCodeFrom((field.element() as HTMLInputElement).value) ?? ''
  expect(await new CompressedRouteCodec().decode(code)).toEqual([forSharing(commute)])
  await expect
    .element(screen.getByRole('img', { name: 'QR-Code mit dem Link zu deinen Routen' }))
    .toBeVisible()
})

test('copies the link', async () => {
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  const { screen, field } = await open()

  await screen.getByRole('button', { name: 'Link kopieren' }).click()

  expect(writeText).toHaveBeenCalledWith((field.element() as HTMLInputElement).value)
  await expect.element(screen.getByRole('button', { name: 'Link kopiert' })).toBeVisible()
})

test('selects the link when copying is not allowed', async () => {
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Not allowed'))
  const { screen } = await open()

  await screen.getByRole('button', { name: 'Link kopieren' }).click()

  await expect.element(screen.getByText(/Kopieren ist hier nicht möglich/)).toBeVisible()
})
