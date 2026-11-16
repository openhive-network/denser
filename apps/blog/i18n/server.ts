import { createI18nServer } from '@ui/lib/i18n-server';
import { SMART_SIGNER_NAMESPACE, loadSmartSignerTranslations } from '@smart-signer/lib/i18n';
import * as settings from './settings';

export const { getTranslation } = createI18nServer(settings, (language, namespace) =>
  namespace === SMART_SIGNER_NAMESPACE
    ? loadSmartSignerTranslations(language)
    : import(`../locales/${language}/${namespace}.json`)
);
