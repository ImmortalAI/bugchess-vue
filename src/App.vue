<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import HeaderComponent from './components/common/HeaderComponent.vue';
import { useTranslation } from './composables/useTranslation';
import { onMounted } from 'vue';

const { restoreLanguage } = useTranslation();

onMounted(() => {
  restoreLanguage();
});
</script>

<template>
  <HeaderComponent />
  <div class="w-full h-full pt-16">
    <RouterView />
  </div>
  <Toaster />
</template>

<style scoped></style>
