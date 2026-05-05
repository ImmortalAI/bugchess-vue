<script setup lang="ts">
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import { cn } from '@/lib/utils';
import ConfirmButton from './ConfirmButton.vue';
import SimpleChatRoot from './SimpleChat/SimpleChatRoot.vue';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from './ChatComponent/types';
import type { BughouseData } from '@/api/chess/chess.model';

const props = defineProps<{
  lastMessage: ChatMessage | null;
  gameStatus: BughouseData['status'];
  myTeamIdx: 0 | 1;
  quickMessages?: string[];
  disabled?: boolean;
  class?: string;
}>();

const emit = defineEmits<{
  send: [message: string];
  resign: [];
  leave: [];
}>();

const { t } = useTranslation();

const resultText = computed(() => {
  if (!props.gameStatus) return null;
  if (props.gameStatus === 'Draw') return t('match.gameResult.draw');
  if (props.gameStatus === 'Abort') return t('match.gameResult.aborted');
  const iWon =
    (props.gameStatus === 'WinA' && props.myTeamIdx === 0) ||
    (props.gameStatus === 'WinB' && props.myTeamIdx === 1);
  return iWon ? t('match.gameResult.win') : t('match.gameResult.loss');
});
</script>

<template>
  <div :class="cn('flex flex-col gap-1.5', props.class)">
    <div v-if="resultText" class="text-center font-semibold text-lg py-1">
      {{ resultText }}
    </div>
    <SimpleChatRoot
      :message="lastMessage"
      :quick-messages="quickMessages"
      :disabled="disabled || !!gameStatus"
      @send="emit('send', $event)"
    />
    <Button v-if="gameStatus" variant="outline" @click="emit('leave')">
      {{ t('match.backToLobby') }}
    </Button>
    <ConfirmButton
      v-else
      :label="t('match.resign')"
      :confirm-label="t('match.resignConfirm')"
      @confirm="emit('resign')"
    />
  </div>
</template>
