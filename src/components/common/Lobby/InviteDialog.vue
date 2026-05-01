<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Input from '@/components/ui/input/Input.vue';
import Label from '@/components/ui/label/Label.vue';
import { useTranslation } from '@/composables/useTranslation';

const props = defineProps<{ open: boolean; users: string[] }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  invite: [username: string];
}>();

const { t } = useTranslation();

const query = ref('');
const inputFocused = ref(false);

const suggestions = computed(() => {
  const trimmed = query.value.trim().toLowerCase();
  if (!trimmed) return [];
  return props.users.filter((u) => u.toLowerCase().includes(trimmed));
});

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      query.value = '';
      inputFocused.value = false;
    }
  },
);

const selectSuggestion = (username: string) => {
  emit('update:open', false);
  emit('invite', username);
};
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ t('lobby.inviteDialogTitle') }}</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-3">
        <Label for="invite-input">{{ t('lobby.inviteInputLabel') }}</Label>
        <div class="relative">
          <Input
            id="invite-input"
            v-model="query"
            :placeholder="t('lobby.inviteInputPlaceholder')"
            autocomplete="off"
            @focus="inputFocused = true"
            @blur="inputFocused = false"
          />
          <ul
            v-if="inputFocused && suggestions.length > 0"
            class="absolute left-0 right-0 top-[calc(100%+4px)] z-10 rounded-md border border-border bg-popover py-1 shadow-md"
          >
            <li
              v-for="suggestion in suggestions"
              :key="suggestion"
              class="cursor-pointer select-none px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
              @mousedown.prevent="selectSuggestion(suggestion)"
            >
              {{ suggestion }}
            </li>
          </ul>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
