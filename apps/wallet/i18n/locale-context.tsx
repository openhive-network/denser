'use client';

import { createContext, PropsWithChildren, useContext } from 'react';
import { defaultLocale } from './settings';

type LocaleContextValue = {
  locale: string;
};

const LocaleContext = createContext<LocaleContextValue>({ locale: defaultLocale });

export const LocaleProvider = ({
  locale,
  children
}: PropsWithChildren<{
  locale: string;
}>) => {
  return <LocaleContext.Provider value={{ locale }}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);

