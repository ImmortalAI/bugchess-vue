import { useSessionStore } from '@/stores/session';
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => {
  if (to.name !== 'Lobby' && to.name !== 'Game') return;

  const session = useSessionStore();
  if (!session.initialized) return;

  if (to.name === 'Lobby' && !session.isInLobby) {
    return session.isInGame ? { name: 'Game' } : { name: 'Home' };
  }
  if (to.name === 'Game' && !session.isInGame) {
    return session.isInLobby ? { name: 'Lobby' } : { name: 'Home' };
  }
});

export default router;
