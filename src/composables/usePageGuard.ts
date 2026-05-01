import { useSessionStore, type PlayerState } from '@/stores/session';
import { watch } from 'vue';
import { useRouter } from 'vue-router';

export function usePageGuard(requiredState: PlayerState) {
  const session = useSessionStore();
  const router = useRouter();

  watch(
    () => session.initialized,
    (isInit) => {
      if (!isInit || session.state === requiredState) return;

      if (session.isInGame) router.replace({ name: 'Game' });
      else if (session.isInLobby) router.replace({ name: 'Lobby' });
      else router.replace({ name: 'Home' });
    },
    { immediate: true },
  );
}
