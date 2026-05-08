<script setup lang="ts">
import multiavatar from '@multiavatar/multiavatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ChessClock from './ChessClock.vue';
import { cn } from '@/lib/utils';
import { computed } from 'vue';

interface PlayerPanelProps {
  username: string;
  remainingMs: number;
  clockActive?: boolean;
  /** 'inline'       — clock after name (right), default
   *  'inline-start' — clock before avatar (left)
   *  'top'          — clock above avatar+name row
   *  'bottom'       — clock below avatar+name row */
  clockPosition?: 'inline' | 'inline-start' | 'top' | 'bottom';
  showClock?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<PlayerPanelProps>(), {
  clockPosition: 'inline',
  showClock: true,
});

const avatarSrc = computed(() => {
  const svg = multiavatar(props.username);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
});
</script>

<template>
  <div :class="cn('flex flex-col gap-1', props.class)">
    <!-- Clock above -->
    <ChessClock v-if="showClock && clockPosition === 'top'" :remaining-ms="props.remainingMs"
      :active="props.clockActive" />

    <!-- Avatar + name row (+ inline clock) -->
    <div class="flex items-center gap-2">
      <!-- clock-left layout: [clock] [name] [avatar] -->
      <template v-if="clockPosition === 'inline-start'">
        <ChessClock v-if="showClock" :remaining-ms="props.remainingMs" :active="props.clockActive" />
        <span class="text-sm font-medium truncate flex-1 min-w-0 text-right">{{
          props.username
        }}</span>
        <Avatar class="size-8 shrink-0">
          <AvatarImage class="grayscale" :src="avatarSrc" :alt="props.username" />
          <AvatarFallback>{{ props.username[0]?.toUpperCase() }}</AvatarFallback>
        </Avatar>
      </template>
      <!-- all other layouts: [avatar] [name] [clock?] -->
      <template v-else>
        <Avatar class="size-8 shrink-0">
          <AvatarImage class="grayscale" :src="avatarSrc" :alt="props.username" />
          <AvatarFallback>{{ props.username[0]?.toUpperCase() }}</AvatarFallback>
        </Avatar>
        <span class="text-sm font-medium truncate flex-1 min-w-0">{{ props.username }}</span>
        <ChessClock v-if="showClock && clockPosition === 'inline'" :remaining-ms="props.remainingMs"
          :active="props.clockActive" />
      </template>
    </div>

    <!-- Clock below -->
    <ChessClock v-if="showClock && clockPosition === 'bottom'" :remaining-ms="props.remainingMs"
      :active="props.clockActive" />
  </div>
</template>
