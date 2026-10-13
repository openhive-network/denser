'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@ui/lib/utils';

export const LANGUAGES = [
  { locale: 'ar', label: 'عر' },
  { locale: 'en', label: '🇬🇧' },
  { locale: 'es', label: '🇪🇸' },
  { locale: 'fr', label: '🇫🇷' },
  { locale: 'it', label: '🇮🇹' },
  { locale: 'ja', label: '🇯🇵' },
  { locale: 'ko', label: '🇰🇷' },
  { locale: 'pl', label: '🇵🇱' },
  { locale: 'ru', label: '🇷🇺' },
  { locale: 'zh', label: '🇨🇳' }
];

/** The current UI locale (null until read from the cookie), its flag label, and a function that switches to another locale. */
export function useLanguageSwitch() {
  const router = useRouter();
  const [lang, setLang] = useState<string | null>(null);

  useEffect(() => {
    const savedLang = getCookie('NEXT_LOCALE') || 'en';
    if (!lang) {
      setLang(savedLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeLanguage = (locale: string) => {
    // Delete any existing NEXT_LOCALE cookies first
    document.cookie = 'NEXT_LOCALE=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    // Set new cookie with proper path and attributes
    document.cookie = `NEXT_LOCALE=${locale}; path=/; SameSite=Lax`;
    setLang(locale);

    // In App Router, reload the page to apply the new locale
    router.refresh();
    if (document.documentElement.lang !== locale) {
      window.location.reload();
    }
  };

  const label = LANGUAGES.find((language) => language.locale === lang)?.label;
  return { lang, label, changeLanguage };
}
