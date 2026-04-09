<script setup lang="ts">
const props = defineProps<{
  nickname?: string;
  message: string;
}>();
</script>

<template>
  <div class="flex items-start gap-2 p-2 border rounded-lg border-slate-500">
    <span v-if="nickname" class="font-bold">{{ props.nickname }}</span
    ><span>{{ props.message }}</span>
  </div>
</template>
