import { getCookie } from '@ui/lib/utils';

import { getStorageItem, setStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';

export const LOCALE_KEY = 'NEXT_LOCALE';

export const getLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  // Language preference is permanent (no TTL)
  return getStorageItem<string>(LOCALE_KEY) || getCookie(LOCALE_KEY) || 'en';
};

export const setLanguage = (locale: string) => {
  document.cookie = `${LOCALE_KEY}=${locale}; SameSite=Lax; path=/`;
  // Language preference is permanent (no TTL)
  setStorageItem(LOCALE_KEY, locale, StorageTTL.PERMANENT);
};
