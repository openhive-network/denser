'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLanguage, setLanguage } from '../../utils/language';

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

/** The current UI locale, its flag label, and a function that switches to another locale. */
export function useLanguageSwitch() {
  const router = useRouter();
  const [lang, setLang] = useState(getLanguage());

  const changeLanguage = (locale: string) => {
    setLanguage(locale);
    setLang(locale);
    router.refresh();
  };

  const label = LANGUAGES.find((language) => language.locale === lang)?.label;
  return { lang, label, changeLanguage };
}
