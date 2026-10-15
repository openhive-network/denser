import { getStorageItem, removeStorageItem } from '@ui/lib/storage-with-ttl';
import { readLocaleCookie, writeLocaleCookie } from '@ui/lib/locale-cookie';
import { defaultLocale, languages } from '@/blog/i18n/settings';

/** localStorage key older builds also kept the language in; the cookie is the only source now. */
const LEGACY_STORAGE_KEY = 'NEXT_LOCALE';

export const getLanguage = () => {
  if (typeof window === 'undefined') return defaultLocale;
  return readLocaleCookie() || defaultLocale;
};

export const setLanguage = (locale: string) => {
  if (!languages.includes(locale)) return;
  writeLocaleCookie(locale);
};

/**
 * Removes the language older builds stored in localStorage and returns it when it is a supported
 * locale, so it can stand in for a missing cookie once.
 */
export const takeLegacyStoredLanguage = (): string | null => {
  const stored = getStorageItem<string>(LEGACY_STORAGE_KEY);
  removeStorageItem(LEGACY_STORAGE_KEY);
  return stored && languages.includes(stored) ? stored : null;
};
