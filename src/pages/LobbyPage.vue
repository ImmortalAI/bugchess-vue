<template>
  <div class="flex justify-center items-center w-full h-full">
    <div class="flex flex-col gap-8 p-8 border border-primary rounded-lg">
      <ChessClockSlider v-model:minutes="lobby.time" v-model:seconds="lobby.increment" />
      <div class="flex gap-4 items-center">
        <div class="flex flex-col gap-2 flex-1 border border-border rounded-md p-3">
          <span class="text-xs font-medium text-muted-foreground text-center">{{ t('lobby.myTeam') }}</span>
          <LobbyPlayer username="ImmortalAI" />
          <LobbyPlayer />
        </div>
        <div class="shrink-0 bg-muted border border-border px-4 py-2 rounded-md text-lg font-semibold text-foreground">
          VS
        </div>
        <div class="flex flex-col gap-2 flex-1 border border-border rounded-md p-3">
          <span class="text-xs font-medium text-muted-foreground text-center">{{ t('lobby.enemyTeam') }}</span>
          <LobbyPlayer username="Partner" />
          <LobbyPlayer />
        </div>
      </div>
      <div class="flex justify-between">
        <div class="flex items-center space-x-2">
          <Switch id="rating-switch" />
          <Label for="rating-switch">{{ t('lobby.rating') }}</Label>
        </div>
        <Button @click="router.push('/match')">{{ t('lobby.startGame') }}</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ChessClockSlider from '@/components/chess/ChessClockSlider.vue';
import LobbyPlayer from '@/components/lobby/LobbyPlayer.vue';
import Button from '@/components/ui/button/Button.vue';
import Label from '@/components/ui/label/Label.vue';
import Switch from '@/components/ui/switch/Switch.vue';
import { useTranslation } from '@/composables/useTranslation';
import { useLobbyStore } from '@/stores/lobby';
import { useRouter } from 'vue-router';

const { t } = useTranslation();
const lobby = useLobbyStore();

const router = useRouter();
</script>
