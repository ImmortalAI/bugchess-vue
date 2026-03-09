<template>
  <div class="w-full h-full relative">
    <div
      class="flex flex-col w-[50%] h-full justify-center items-center absolute top-0 left-0 transition-transform"
      :class="formTranslate"
    >
      <RouterView />
    </div>
    <Separator orientation="vertical" class="absolute top-0 left-1/2 h-full" />
    <div
      class="flex flex-col w-[50%] h-full justify-center items-center absolute top-0 right-0 transition-transform"
      :class="infoTranslate"
    >
      <h1 class="text-4xl font-bold mb-4">Welcome to Bugchess</h1>
      <p class="text-lg text-gray-600 mb-8 text-center">
        Please sign in to your account or register if you don't have one.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Separator } from '@/components/ui/separator'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const formTranslate = computed(() => {
  if (route.path === '/signin') {
    return 'translate-x-0'
  } else if (route.path === '/signup') {
    return 'translate-x-[100%]'
  }
  return 'translate-x-0'
})

const infoTranslate = computed(() => {
  if (route.path === '/signin') {
    return 'translate-x-0'
  } else if (route.path === '/signup') {
    return '-translate-x-[100%]'
  }
  return 'translate-x-0'
})
</script>
