import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'

import App from './App.vue'

test('shows the product name', async () => {
  const screen = await render(App)

  await expect.element(screen.getByRole('heading', { name: 'Kairos' })).toBeVisible()
})
