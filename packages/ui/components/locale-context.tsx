'use client';

import { createContext, PropsWithChildren, useContext } from 'react';

const DEFAULT_LOCALE = 'en';

type LocaleContextValue = {
  locale: string;
};

const LocaleContext = createContext<LocaleContextValue>({ locale: DEFAULT_LOCALE });

export const LocaleProvider = ({
  locale,
  children
}: PropsWithChildren<{
  locale: string;
}>) => {
  return <LocaleContext.Provider value={{ locale }}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);
