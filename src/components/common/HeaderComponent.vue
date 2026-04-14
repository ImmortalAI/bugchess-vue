<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import UserMenu from './UserMenu.vue';

const router = useRouter();
const route = useRoute();
</script>

<template>
  <div class="flex justify-between items-center w-full absolute top-0 left-0 px-4 py-2">
    <h1 class="text-2xl font-bold cursor-pointer" @click="router.push('/')">Bugchess</h1>
    <UserMenu :grayscale="route.name === 'Game'" />
  </div>
</template>
