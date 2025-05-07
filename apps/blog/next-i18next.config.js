const path = require('path');

const i18nConfig = {
  i18n: {
    defaultNS: 'common_blog',
    defaultLocale: 'en',
    locales: ['ar', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'zh']
  },
  reloadOnPrerender: process.env.NODE_ENV !== 'production',
  localeDetection: true,
  load: 'languageOnly',
  detection: {
    order: ['cookie', 'localStorage', 'navigator'],
    caches: ['cookie', 'localStorage'],
    cookieName: 'i18next',
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieSameSite: 'strict',
    lookupCookie: 'i18next',
    lookupLocalStorage: 'i18nextLng'
  }
};

/** @type {import('next-i18next').UserConfig} */
const config = {
  ...i18nConfig,
  localePath: path.resolve('./public/locales')
};

module.exports = config;
