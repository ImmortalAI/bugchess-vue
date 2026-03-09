<script setup lang="ts">
import HeaderComponent from './components/common/HeaderComponent.vue'
</script>

<template>
  <HeaderComponent />
  <div class="w-full h-full pt-16">
    <RouterView />
  </div>
</template>

<style scoped></style>
