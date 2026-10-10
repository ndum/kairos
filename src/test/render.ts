import type { Component } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { render } from 'vitest-browser-vue'

import { createAppI18n } from '@/ui/i18n'
import type { Locale } from '@/ui/i18n/locale'
import { createAppRouter } from '@/ui/router'

export interface RenderOptions {
  readonly path?: string
  readonly locale?: Locale
  readonly props?: Record<string, unknown>
}

/** Renders a component with the app's router and translations, in German by default. */
export async function renderWithApp(component: Component, options: RenderOptions = {}) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(options.path ?? '/')
  await router.isReady()

  const screen = await render(component, {
    props: options.props,
    global: { plugins: [router, createAppI18n(options.locale ?? 'de')] },
  })
  return { ...screen, router }
}
