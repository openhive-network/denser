'use client';

import { useEffect, useState } from 'react';
import i18next from 'i18next';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { getOptions, languages, cookieName, defaultLocale } from './settings';

import { isServer } from '@tanstack/react-query';

/**
 * Gets the language from cookie, works on both server and client side
 * On server: tries to use Next.js cookies() if available
 * On client: uses document.cookie
 * Returns the language code or empty string if not found
 */
export const getLanguageFromCookie = (): string => {
  // Server-side: try to use Next.js cookies() if available
  if (typeof window === 'undefined') {
    try {
      // Dynamic import to avoid issues in client components
      const { cookies } = require('next/headers');
      const cookieStore = cookies();
      const cookie = cookieStore.get(cookieName);
      return cookie?.value || '';
    } catch (error) {
      // If cookies() is not available (e.g., in client component), return empty string
      return '';
    }
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

export function useTranslation(ns: string, options?: any) {
  const lng = getLanguageFromCookie();
  const ret = useTranslationOrg(ns, options);

  const { i18n } = ret;
  if (isServer && lng && i18n.resolvedLanguage !== lng) {
    i18n.changeLanguage(lng);
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (activeLng === i18n.resolvedLanguage) return;
      setActiveLng(i18n.resolvedLanguage);
    }, [activeLng, i18n.resolvedLanguage]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (!lng || i18n.resolvedLanguage === lng) return;
      i18n.changeLanguage(lng);
    }, [lng, i18n]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
  }
  return ret;
}
