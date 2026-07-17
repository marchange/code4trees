import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from './views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    {
      path: '/arena',
      name: 'arena',
      // Lazy-Loading: Arena-Code wird erst geladen, wenn die Seite besucht wird
      component: () => import('./views/ArenaView.vue')
    }
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  }
})

export default router
