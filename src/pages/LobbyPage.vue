<template>
  <div class="flex justify-center items-center w-full h-full">
    <div class="flex flex-col gap-8 p-8 border border-primary rounded-lg">
      <ChessClockSlider v-model:minutes="lobby.time" v-model:seconds="lobby.increment" />
      <div class="grid grid-cols-2 gap-4 relative">
        <div class="w-full h-36 border-2"></div>
        <div class="w-full h-36 border-2"></div>
        <div class="w-full h-36 border-2"></div>
        <div class="w-full h-36 border-2"></div>
        <div
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-100 border-2 border-stone-300 px-4 py-2 rounded-md text-lg font-semibold"
        >
          VS
        </div>
      </div>
      <div class="flex justify-between">
        <div class="flex items-center space-x-2">
          <Switch id="rating-switch" />
          <Label for="rating-switch">Rating</Label>
        </div>
        <Button @click="router.push('/match')">Start Matchmaking</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ChessClockSlider from '@/components/chess/ChessClockSlider.vue';
import Button from '@/components/ui/button/Button.vue';
import Label from '@/components/ui/label/Label.vue';
import Switch from '@/components/ui/switch/Switch.vue';
import { useLobbyStore } from '@/stores/lobby';
import { useRouter } from 'vue-router';

const lobby = useLobbyStore();

const router = useRouter();
</script>
