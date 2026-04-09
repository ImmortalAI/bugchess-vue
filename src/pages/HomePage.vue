<template>
  <div class="relative w-full h-full">
    <img src="@/assets/imgs/logo.png" alt="" aria-hidden="true"
      class="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none select-none filter dark:invert-100" />
    <div class="relative w-full h-full flex items-start sm:items-center justify-center p-4 overflow-auto">
      <div class="w-full max-w-lg grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <TileButton v-for="option in quickGameOptions" :key="option.time" :title="option.time"
          :subtitle="t(option.name)" @click="createLobby(option)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TileButton from '@/components/common/TileButton.vue';
import { useTranslation } from '@/composables/useTranslation';
import { useLobbyStore } from '@/stores/lobby';
import { useWebSocketStore } from '@/stores/ws';
import { quickGameOptions, type QuickGameOption } from '@/utils/quickGameOptions';
import { useRouter } from 'vue-router';

const { t } = useTranslation();

const lobby = useLobbyStore();
const ws = useWebSocketStore();

const router = useRouter();

const createLobby = (option: QuickGameOption) => {
  lobby.setTime(option.time);

  router.push('/lobby');
};
</script>
