<template>
  <div class="flex justify-between items-center w-full absolute top-0 left-0 px-4 py-2">
    <h1 class="text-2xl font-bold">Bugchess</h1>
    <div class="flex gap-4">
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        @click="router.push('signin')"
      >
        Login
      </button>
      <button
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        @click="router.push('signup')"
      >
        Register
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>
