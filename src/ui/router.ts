import { type RouterHistory, START_LOCATION, createRouter, createWebHashHistory } from 'vue-router'

import type { NavigationSection } from './layout/navigation'
import NowView from './views/NowView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Area of the app the page belongs to, highlighted in the navigation. */
    section?: NavigationSection
  }
}

const RouteEditorView = () => import('./views/RouteEditorView.vue')

// Hash URLs keep deep links working on static hosting below a sub-path, such as
// GitHub Pages and its pull request previews.
export function createAppRouter(
  history: RouterHistory = createWebHashHistory(import.meta.env.BASE_URL),
) {
  return createRouter({
    history,
    routes: [
      { path: '/', name: 'now', component: NowView, meta: { section: 'now' } },
      {
        path: '/plan',
        name: 'plan',
        component: () => import('./views/PlanView.vue'),
        meta: { section: 'plan' },
      },
      {
        path: '/routes',
        name: 'routes',
        component: () => import('./views/RoutesView.vue'),
        meta: { section: 'routes' },
      },
      {
        path: '/routes/new',
        name: 'route-new',
        component: RouteEditorView,
        meta: { section: 'routes' },
      },
      {
        path: '/routes/:id',
        name: 'route-edit',
        component: RouteEditorView,
        props: true,
        meta: { section: 'routes' },
      },
      {
        path: '/import',
        name: 'import',
        component: () => import('./views/ImportView.vue'),
        meta: { section: 'routes' },
      },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
    // The browser restores the position on load. Scrolling then would force an early layout.
    scrollBehavior: (_to, from, saved) => (from === START_LOCATION ? false : (saved ?? { top: 0 })),
  })
}
