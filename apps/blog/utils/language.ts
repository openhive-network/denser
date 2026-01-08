import { getCookie } from '@ui/lib/utils';

export const LOCALE_KEY = 'NEXT_LOCALE';

export const getLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem(LOCALE_KEY) || getCookie(LOCALE_KEY) || 'en';
};

export const setLanguage = (locale: string) => {
  document.cookie = `${LOCALE_KEY}=${locale}; SameSite=Lax; path=/`;
  localStorage.setItem(LOCALE_KEY, locale);
};
