<script setup lang="ts">
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/composables/useTranslation';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const { t } = useTranslation();

const formTranslate = computed(() => {
  if (route.path === '/signin') {
    return 'sm:translate-x-0';
  } else if (route.path === '/signup') {
    return 'sm:translate-x-[100%]';
  }
  return 'sm:translate-x-0';
});

const infoTranslate = computed(() => {
  if (route.path === '/signin') {
    return 'sm:translate-x-0';
  } else if (route.path === '/signup') {
    return 'sm:-translate-x-[100%]';
  }
  return 'sm:translate-x-0';
});
</script>

<template>
  <div class="w-full h-full flex items-center justify-center sm:relative sm:block">
    <div
      class="sm:absolute sm:top-0 sm:left-0 sm:w-[50%] sm:h-full sm:flex sm:flex-col sm:justify-center sm:items-center sm:transition-transform"
      :class="formTranslate"
    >
      <RouterView />
    </div>
    <Separator orientation="vertical" class="hidden sm:block absolute top-0 left-1/2 h-full" />
    <div
      class="hidden sm:flex flex-col w-[50%] h-full justify-center items-center absolute top-0 right-0 sm:transition-transform"
      :class="infoTranslate"
    >
      <h1 class="text-4xl font-bold mb-4">{{ t('authPage.infoTitle') }}</h1>
      <p class="text-lg text-gray-600 mb-8 text-center">
        {{ t('authPage.infoDescription') }}
      </p>
    </div>
  </div>
</template>
