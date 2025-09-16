'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import i18next from 'i18next';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { getOptions, languages, cookieName, defaultLocale } from './settings';

import { isServer } from '@tanstack/react-query';

i18next
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) => import(`../locales/${language}/${namespace}.json`)
    )
  )
  .init({
    ...getOptions(),
    lng: undefined, // let detect the language on client side
    detection: {
      order: ['cookie', 'path', 'htmlTag', 'navigator'],
      cookieName
    },
    preload: isServer ? languages : []
  });

export function useTranslation(ns: string, options?: any) {
  const ret = useTranslationOrg(ns, options);

  // const { i18n } = ret;
  // if (isServer && lng && i18n.resolvedLanguage !== lng) {
  //   i18n.changeLanguage(lng);
  // } else {
  //   // eslint-disable-next-line react-hooks/rules-of-hooks
  //   const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);
  //   // eslint-disable-next-line react-hooks/rules-of-hooks
  //   useEffect(() => {
  //     if (activeLng === i18n.resolvedLanguage) return;
  //     setActiveLng(i18n.resolvedLanguage);
  //   }, [activeLng, i18n.resolvedLanguage]);
  //   // eslint-disable-next-line react-hooks/rules-of-hooks
  //   useEffect(() => {
  //     if (!lng || i18n.resolvedLanguage === lng) return;
  //     i18n.changeLanguage(lng);
  //   }, [lng, i18n]);
  //   // eslint-disable-next-line react-hooks/rules-of-hooks
  // }
  return ret;
}
