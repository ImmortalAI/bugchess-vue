import { createI18n } from 'vue-i18n';

import ru from './locales/ru.json';

export type MessagesSchema = typeof ru;
export type Locales = 'ru' | 'en';

const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'ru',
  messages: {
    ru: ru as MessagesSchema,
  },
});

export default i18n;
