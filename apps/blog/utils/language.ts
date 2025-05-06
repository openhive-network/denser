export const LOCALE_KEY = 'NEXT_LOCALE';

export const getLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem(LOCALE_KEY) || getCookie(LOCALE_KEY) || 'en';
};

export const setLanguage = (locale: string) => {
  document.cookie = `${LOCALE_KEY}=${locale}; SameSite=Lax; path=/`;
  localStorage.setItem(LOCALE_KEY, locale);
};

export const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};
