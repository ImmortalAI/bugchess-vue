import { useStorage } from '@vueuse/core';
import { useTranslation } from './useTranslation';

const DEFAULT_MESSAGES: Record<string, string[]> = {
  ru: [
    'Отличный ход!',
    'Отлично сыграли!',
    'Не ожидал такого хода.',
    'Твой ход.',
    'Хорошей игры!',
  ],
  en: [
    'Great move!',
    'Well played!',
    "Didn't see that coming.",
    'Your turn.',
    'Good game!',
  ],
};

const STORAGE_KEY = 'quick-messages';

const getDefaults = (locale: string): string[] => DEFAULT_MESSAGES[locale] ?? DEFAULT_MESSAGES.ru ?? [];

export function useQuickMessages() {
  const { locale } = useTranslation();

  const messages = useStorage<string[]>(STORAGE_KEY, getDefaults(locale.value));

  const add = (text: string) => {
    messages.value = [...messages.value, text];
  };

  const remove = (index: number) => {
    messages.value = messages.value.filter((_, i) => i !== index);
  };

  const reset = () => {
    messages.value = getDefaults(locale.value);
  };

  return { messages, add, remove, reset };
}
