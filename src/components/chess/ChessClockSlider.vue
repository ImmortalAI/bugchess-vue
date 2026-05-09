<script setup lang="ts">
import { useTranslation } from '@/composables/useTranslation';
import Slider from '../ui/slider/Slider.vue';
import { computed } from 'vue';

const { t } = useTranslation();

const minutes = defineModel<number>('minutes', { required: true });
const seconds = defineModel<number>('seconds', { required: true });

const props = defineProps<{ disabled?: boolean }>();

const minutesArray = computed({
  get() {
    return [minutes.value];
  },
  set(val: number[]) {
    minutes.value = val[0]!;
  },
});

const secondsArray = computed({
  get() {
    return [seconds.value];
  },
  set(val: number[]) {
    seconds.value = val[0]!;
  },
});
</script>

<template>
  <div class="flex flex-col sm:flex-row gap-2 sm:gap-1">
    <div class="flex flex-col gap-2 w-full sm:w-xs">
      <div class="flex justify-between">
        <span>{{ t('chessClockSlider.textMinutes') }}</span
        ><span
          class="bg-muted border border-border rounded-xs aspect-square text-[0.9rem] text-center"
          >{{ minutes }}</span
        >
      </div>
      <Slider v-model="minutesArray" :min="1" :max="180" :step="1" :disabled="props.disabled" />
    </div>
    <div class="flex flex-col gap-2 w-full sm:w-xs">
      <div class="flex justify-between">
        <span>{{ t('chessClockSlider.textSeconds') }}</span
        ><span
          class="bg-muted border border-border rounded-xs aspect-square text-[0.9rem] text-center"
          >{{ seconds }}</span
        >
      </div>
      <Slider v-model="secondsArray" :min="0" :max="59" :step="1" :disabled="props.disabled" />
    </div>
  </div>
</template>
