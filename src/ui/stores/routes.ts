import { defineStore } from 'pinia'
import { onScopeDispose, ref, shallowRef } from 'vue'

import type { MergeResult, RemovedRoute, RouteDraft } from '@/application/route-library'
import type { Route } from '@/domain/route'

import { useServices } from '../services'

/** The user's routes, kept in sync with the route library and other tabs. */
export const useRouteStore = defineStore('routes', () => {
  const library = useServices().routes
  const routes = shallowRef<readonly Route[]>(library.snapshot.routes)
  const saved = ref(library.snapshot.saved)

  onScopeDispose(
    library.subscribe((snapshot) => {
      routes.value = snapshot.routes
      saved.value = snapshot.saved
    }),
  )

  return {
    routes,
    /** False when the last change could not be stored on the device. */
    saved,
    find: (id: string): Route | undefined => routes.value.find((route) => route.id === id),
    add: (draft: RouteDraft): Route => library.add(draft),
    update: (route: Route): void => {
      library.update(route)
    },
    remove: (id: string): RemovedRoute | null => library.remove(id),
    restore: (removed: RemovedRoute): void => {
      library.restore(removed)
    },
    move: (id: string, offset: number): void => {
      library.move(id, offset)
    },
    merge: (incoming: readonly Route[]): MergeResult => library.merge(incoming),
  }
})
