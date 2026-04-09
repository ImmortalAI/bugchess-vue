<script setup lang="ts">
import multiavatar from '@multiavatar/multiavatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/composables/useTranslation';
import { computed, ref } from 'vue';
import personImg from '@/assets/imgs/person.png';

interface LobbyPlayerProps {
  username?: string;
}

const props = defineProps<LobbyPlayerProps>();
const emit = defineEmits<{
  invite: [];
  kick: [];
}>();

const { t } = useTranslation();

const confirmingKick = ref(false);

const avatarSrc = computed(() => {
  if (!props.username) return undefined;
  const svg = multiavatar(props.username);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
});

const onClick = () => {
  if (!props.username) {
    emit('invite');
  } else {
    confirmingKick.value = true;
  }
};

const confirmKick = () => {
  confirmingKick.value = false;
  emit('kick');
};

const cancelKick = () => {
  confirmingKick.value = false;
};
</script>

<template>
  <div
    class="relative w-full h-36 border-2 rounded-md overflow-hidden cursor-pointer select-none"
    @click="onClick"
  >
    <!-- Player info -->
    <div class="flex flex-col items-center justify-center gap-2 w-full h-full transition-opacity"
      :class="confirmingKick ? 'opacity-20 pointer-events-none' : 'opacity-100'">
      <Avatar class="size-12">
        <AvatarImage v-if="props.username" :src="avatarSrc ?? ''" :alt="props.username" />
        <AvatarImage v-else :src="personImg" alt="" class="dark:invert" />
        <AvatarFallback>{{ props.username?.[0]?.toUpperCase() ?? '?' }}</AvatarFallback>
      </Avatar>
      <span class="text-sm" :class="props.username ? 'font-medium' : 'text-muted-foreground'">
        {{ props.username ?? t('lobby.invitePlayer') }}
      </span>
    </div>

    <!-- Kick confirmation overlay -->
    <Transition name="confirm">
      <div v-if="confirmingKick"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 bg-background/95 backdrop-blur-sm"
        @click.stop>
        <span class="text-xs font-semibold text-destructive text-center leading-tight">
          {{ t('lobby.kickConfirm') }}
        </span>
        <Button size="sm" variant="destructive" class="w-full" @click="confirmKick">
          {{ t('lobby.kickConfirmYes') }}
        </Button>
        <Button size="sm" variant="ghost" class="w-full" @click="cancelKick">
          {{ t('lobby.kickConfirmNo') }}
        </Button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
