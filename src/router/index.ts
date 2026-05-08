import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  const p = performance.now();
  const auth = useAuthStore();
  console.warn(`Init ${performance.now() - p} ms`);

  if (!auth.initialized && !auth.isAuthenticated) await auth.refresh();

  console.warn(`Refresh ${performance.now() - p} ms`);

  if (!to.meta.requiredAuth && !to.meta.requiredGuest) return;

  if (to.meta.requiredAuth && !auth.isAuthenticated) return '/signin';
  if (to.meta.requiredGuest && auth.isAuthenticated) return { name: 'Home' };
});

export default router;
