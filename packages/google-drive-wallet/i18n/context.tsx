'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { TFunction } from 'i18next';

const GoogleDriveWalletI18nContext = createContext<TFunction | null>(null);

export function GoogleDriveWalletI18nProvider({
  t,
  children
}: {
  t: TFunction;
  children: ReactNode;
}) {
  return (
    <GoogleDriveWalletI18nContext.Provider value={t}>
      {children}
    </GoogleDriveWalletI18nContext.Provider>
  );
}

export function useGDWTranslation() {
  const t = useContext(GoogleDriveWalletI18nContext);
  if (!t) {
    throw new Error('useGDWTranslation must be used within GoogleDriveWalletI18nProvider');
  }
  return { t };
}
