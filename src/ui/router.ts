import { type RouterHistory, createRouter, createWebHashHistory } from 'vue-router'

import NowView from './views/NowView.vue'

// Hash URLs keep deep links working on static hosting below a sub-path, such as
// GitHub Pages and its pull request previews.
export function createAppRouter(
  history: RouterHistory = createWebHashHistory(import.meta.env.BASE_URL),
) {
  return createRouter({
    history,
    routes: [
      { path: '/', name: 'now', component: NowView },
      { path: '/plan', name: 'plan', component: () => import('./views/PlanView.vue') },
      { path: '/routes', name: 'routes', component: () => import('./views/RoutesView.vue') },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  })
}
