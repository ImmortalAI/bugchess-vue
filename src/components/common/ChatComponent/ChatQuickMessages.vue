<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue';
import Popover from '@/components/ui/popover/Popover.vue';
import PopoverContent from '@/components/ui/popover/PopoverContent.vue';
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue';
import { Zap } from 'lucide-vue-next';
import { ref } from 'vue';

const props = defineProps<{
  messages: string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [message: string];
}>();

const open = ref(false);

const pickMsg = (msg: string) => {
  emit('select', msg);
  open.value = false;
};
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="secondary"
        size="icon"
        class="shrink-0 size-9"
        aria-label="Quick messages"
        :disabled="props.disabled"
      >
        <Zap class="size-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      side="top"
      align="start"
      :side-offset="8"
      class="w-auto max-h-52 overflow-y-auto p-1"
    >
      <div>
        <Button
          v-for="(msg, i) in messages"
          :key="i"
          variant="ghost"
          size="sm"
          class="justify-start text-left h-auto py-1.5 px-2.5 font-normal"
          @click="pickMsg(msg)"
        >
          {{ msg }}
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
