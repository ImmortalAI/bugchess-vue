<template>
  <Transition name="invite-slide">
    <div
      v-if="visible"
      class="fixed bottom-6 right-6 z-50 w-80 rounded-xl border border-border bg-card text-card-foreground shadow-lg"
    >
      <div class="flex flex-col gap-4 p-5">
        <div class="flex flex-col gap-1">
          <p class="text-sm font-semibold leading-tight">
            {{ t('gameInvite.title') }}
          </p>
          <p class="text-sm text-muted-foreground">
            {{ t('gameInvite.message', { username: inviterUsername }) }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button class="flex-1" size="sm" @click="emit('accept')">
            {{ t('gameInvite.accept') }}
          </Button>
          <Button class="flex-1" size="sm" variant="outline" @click="emit('decline')">
            {{ t('gameInvite.decline') }}
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue';
import { useTranslation } from '@/composables/useTranslation';

defineProps<{
  visible: boolean;
  inviterUsername: string;
}>();

const emit = defineEmits<{
  accept: [];
  decline: [];
}>();

const { t } = useTranslation();
</script>

<style scoped>
.invite-slide-enter-active,
.invite-slide-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.3s ease;
}

.invite-slide-enter-from,
.invite-slide-leave-to {
  transform: translateX(calc(100% + 1.5rem));
  opacity: 0;
}
</style>
