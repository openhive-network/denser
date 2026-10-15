'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from '@ui/components/locale-context';
import { setLanguage } from '../../utils/language';

export const LANGUAGES = [
  { locale: 'ar', label: 'عر' },
  { locale: 'en', label: '🇬🇧' },
  { locale: 'es', label: '🇪🇸' },
  { locale: 'fr', label: '🇫🇷' },
  { locale: 'it', label: '🇮🇹' },
  { locale: 'ja', label: '🇯🇵' },
  { locale: 'pl', label: '🇵🇱' },
  { locale: 'ru', label: '🇷🇺' },
  { locale: 'zh', label: '🇨🇳' }
];

/**
 * The current UI locale (the cookie value the server rendered the page in), its flag label, and a
 * function that switches to another locale.
 */
export function useLanguageSwitch() {
  const router = useRouter();
  const { locale: lang } = useLocale();

  const changeLanguage = (locale: string) => {
    setLanguage(locale);
    // Re-renders the root layout, which hands the new cookie value to LocaleProvider
    router.refresh();
  };

  const label = LANGUAGES.find((language) => language.locale === lang)?.label;
  return { lang, label, changeLanguage };
}
