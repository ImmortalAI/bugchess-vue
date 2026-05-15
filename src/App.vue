<script setup lang="ts">
import 'vue-sonner/style.css';
import { Toaster } from 'vue-sonner';
import HeaderComponent from './components/common/HeaderComponent.vue';
import { useTranslation } from './composables/useTranslation';
import { onMounted } from 'vue';
import { useSessionStore } from './stores/session';

const { restoreLanguage } = useTranslation();
const session = useSessionStore();
const appBuildLabel = __APP_BUILD_LABEL__;

onMounted(async () => {
  restoreLanguage();
});
</script>

<template>
  <HeaderComponent />
  <div class="w-full h-full pt-16">
    <RouterView :key="session.viewKey" />
  </div>
  <div
    class="pointer-events-none fixed bottom-2 left-2 z-50 select-none text-[10px] font-medium text-muted-foreground/60"
  >
    {{ appBuildLabel }}
  </div>
  <Toaster />
</template>

<style scoped></style>
