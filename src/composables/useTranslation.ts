import type { Locales, MessagesSchema } from '@/i18n';
import { nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

export const useTranslation = () => {
  const { t, locale, setLocaleMessage, availableLocales } = useI18n<[MessagesSchema], Locales>({
    useScope: 'global',
  });

  async function restoreLanguage() {
    const savedLocale = localStorage.getItem('locale') as Locales | null;
    if (savedLocale) {
      await setLanguage(savedLocale);
    }
  }

  async function setLanguage(newLocale: Locales) {
    if (!availableLocales.includes(newLocale)) {
      try {
        const messages = await import(`@/i18n/locales/${newLocale}.json`);
        setLocaleMessage(newLocale, messages.default);
      } catch (error) {
        console.error(`Failed to load locale ${newLocale}:`, error);
        return;
      }
    }

    locale.value = newLocale;
    document.querySelector('html')?.setAttribute('lang', newLocale);
    localStorage.setItem('locale', newLocale);
    await nextTick();
  }

  return { t, locale, setLanguage, restoreLanguage };
};
