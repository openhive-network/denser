'use client';

import { createI18nClient } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE, loadSmartSignerTranslations } from '@smart-signer/lib/i18n';
import * as settings from './settings';

export const { useTranslation } = createI18nClient(
  settings,
  (language, namespace) =>
    namespace === SMART_SIGNER_NAMESPACE
      ? loadSmartSignerTranslations(language)
      : import(`../locales/${language}/${namespace}.json`)
);
