const path = require('path');

const i18nConfig = {
  i18n: {
    defaultNS: 'common_blog',
    defaultLocale: 'en',
    locales: [
      'en',
      'es',
      'fr',
      'it',
      'ja',
      'ko',
      'pl',
      'ru',
      'zh'
    ]
  },
  reloadOnPrerender: process.env.NODE_ENV !== 'production',
  localeDetection: false
};

/** @type {import('next-i18next').UserConfig} */
const config = {
  ...i18nConfig,
  localePath: path.resolve('./public/locales')
};

module.exports = config;

