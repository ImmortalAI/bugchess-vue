import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLobbyStore = defineStore('lobby', () => {
  const time = ref<number>(0);
  const increment = ref<number>(0);
  const gameId = ref<string>('');

  const setTime = (timeValue: string) => {
    if (timeValue === '') {
      time.value = 1;
      increment.value = 0;
      return;
    }

    const [minutes, inc] = timeValue.split('+').map(Number);

    if (minutes === undefined || inc === undefined || isNaN(minutes) || isNaN(inc)) {
      time.value = 0;
      increment.value = 0;
      return;
    }

    time.value = minutes;
    increment.value = inc;
  };

  return {
    time,
    increment,
    gameId,
    setTime,
  };
});
