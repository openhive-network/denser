'use client';

import { useEffect, useState } from 'react';
import i18next, { type InitOptions } from 'i18next';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { isServer } from '@tanstack/react-query';
import { useLocale } from '@ui/components/locale-context';

export { Trans } from 'react-i18next';

/** The app's `i18n/settings` module. */
interface I18nSettings {
  languages: string[];
  defaultLocale: string;
  cookieName: string;
  getOptions: (lng: string) => InitOptions;
}

/** Loads one namespace of one language; the import has to live in the app that owns the locale files. */
type NamespaceLoader = (language: string, namespace: string) => Promise<unknown>;

/**
 * Initializes the app's i18next instance and returns its `useTranslation` hook.
 * The server resolves the language from `LocaleProvider` (set by the root layout from the
 * cookie), the browser from the language cookie.
 */
export function createI18nClient(
  { languages, defaultLocale, cookieName, getOptions }: I18nSettings,
  loadNamespace: NamespaceLoader
) {
  /**
   * Reads the language from `document.cookie`. Client-only: during SSR the
   * language comes from `LocaleProvider`, set by the root layout.
   * Returns the language code or empty string if not found
   */
  const getLanguageFromCookie = (): string => {
    if (typeof document === 'undefined') {
      return '';
    }

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
  };

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
    .use(resourcesToBackend(loadNamespace))
    .init({
      ...getOptions(getInitialLanguage()),
      detection: {
        order: ['cookie', 'path', 'htmlTag', 'navigator'],
        cookieName
      },
      // The server shares one instance across requests of every language, so it keeps
      // them all; the browser only needs `lng` (and its fallback), and other
      // languages are fetched by `changeLanguage` when the user switches.
      preload: isServer ? languages : false
    });

  function useTranslation(ns: string, options?: Parameters<typeof useTranslationOrg>[1]) {
    const { locale } = useLocale();
    const lng = isServer ? locale : getLanguageFromCookie();
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
    }
    return ret;
  }

  return { useTranslation };
}
