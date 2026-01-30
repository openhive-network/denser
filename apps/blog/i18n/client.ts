'use client';

import { useEffect, useState } from 'react';
import i18next from 'i18next';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { getOptions, languages, cookieName, defaultLocale } from './settings';

import { isServer } from '@tanstack/react-query';

/**
 * Gets the language from cookie on the client side.
 * This is a client-side only function ('use client' directive).
 * Uses document.cookie to read the language preference.
 * Returns the language code or empty string if not found.
 */
export const getLanguageFromCookie = (): string => {
  // This is a client component - should only run on client side
  if (typeof window === 'undefined') {
    return '';
  }

  // Client-side: use document.cookie
  const name = cookieName + '=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}


function getInitialLanguage(): string {
  if (typeof document === 'undefined') {
    return defaultLocale;
  }
  const htmlLang = document.documentElement.lang;
  if (htmlLang && languages.includes(htmlLang)) {
    return htmlLang;
  }
  const cookieLang = getLanguageFromCookie();
  if (cookieLang && languages.includes(cookieLang)) {
    return cookieLang;
  }
  return defaultLocale;
}

i18next
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) => import(`../locales/${language}/${namespace}.json`)
    )
  )
  .init({
    ...getOptions(getInitialLanguage()),
    detection: {
      order: ['cookie', 'path', 'htmlTag', 'navigator'],
      cookieName
    },
    preload: languages 
  });

export function useTranslation(ns: string, options?: Record<string, unknown>) {
  const lng = getLanguageFromCookie();
  const ret = useTranslationOrg(ns, options);

  const { i18n } = ret;
  if (isServer && lng && i18n.resolvedLanguage !== lng) {
    i18n.changeLanguage(lng);
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- i18next pattern: isServer is constant, branch is stable
    const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);
    // eslint-disable-next-line react-hooks/rules-of-hooks -- i18next pattern: isServer is constant, branch is stable
    useEffect(() => {
      if (activeLng === i18n.resolvedLanguage) return;
      setActiveLng(i18n.resolvedLanguage);
    }, [activeLng, i18n.resolvedLanguage]);
    // eslint-disable-next-line react-hooks/rules-of-hooks -- i18next pattern: isServer is constant, branch is stable
    useEffect(() => {
      if (!lng || i18n.resolvedLanguage === lng) return;
      i18n.changeLanguage(lng);
    }, [lng, i18n]);
  }
  return ret;
}
