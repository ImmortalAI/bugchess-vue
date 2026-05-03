<script setup lang="ts">
import 'vue-sonner/style.css'
import { Toaster } from 'vue-sonner';
import HeaderComponent from './components/common/HeaderComponent.vue';
import { useTranslation } from './composables/useTranslation';
import { useAuthStore } from './stores/auth';
import { useWebSocketStore } from './stores/ws';
import { onMounted } from 'vue';

const { restoreLanguage } = useTranslation();
const auth = useAuthStore();
const ws = useWebSocketStore();

onMounted(async () => {
  restoreLanguage();
  const result = await auth.refresh();
  if (result.isOk) {
    ws.connect();
  }
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
