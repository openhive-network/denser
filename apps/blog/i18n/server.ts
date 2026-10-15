import { createI18nServer } from '@ui/lib/i18n-server';
import * as settings from './settings';

export const { getTranslation } = createI18nServer(
  settings,
  (language, namespace) => import(`../locales/${language}/${namespace}.json`)
);
