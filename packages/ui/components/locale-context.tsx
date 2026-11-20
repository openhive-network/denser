'use client';

import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import i18next from 'i18next';
import { followedLocale, type I18nLanguageSwitch } from '@ui/lib/followed-locale';

const DEFAULT_LOCALE = 'en';

type LocaleContextValue = {
  locale: string;
};

const LocaleContext = createContext<LocaleContextValue>({ locale: DEFAULT_LOCALE });

/**
 * Provides the locale numbers, dates and lists are formatted in: `locale`, the one the server rendered,
 * until i18next switches the browser's texts to another language (the language cookie of a first visit,
 * set before `router.refresh()` brings the server's render of it). From then on the texts' language,
 * so no frame pairs translated text with numbers in the server's locale.
 */
export const LocaleProvider = ({
  locale,
  children
}: PropsWithChildren<{
  locale: string;
}>) => {
  const [languageSwitch, setLanguageSwitch] = useState<I18nLanguageSwitch | null>(null);

  useEffect(() => {
    const follow = (language: string) => setLanguageSwitch({ serverLocale: locale, language });
    i18next.on('languageChanged', follow);
    return () => i18next.off('languageChanged', follow);
  }, [locale]);

  const active = followedLocale(locale, languageSwitch);
  const value = useMemo(() => ({ locale: active }), [active]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);
