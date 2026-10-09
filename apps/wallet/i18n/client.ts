'use client';

import { createI18nClient } from '@ui/lib/i18n-client';
import * as settings from './settings';

export { Trans } from '@ui/lib/i18n-client';

export const { useTranslation } = createI18nClient(
  settings,
  (language, namespace) => import(`../locales/${language}/${namespace}.json`)
);
