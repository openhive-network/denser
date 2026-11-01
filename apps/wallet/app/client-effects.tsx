'use client';

import { useEffect } from 'react';
import { ensureLocaleCookie } from '@ui/lib/locale-cookie';
import { languages, defaultLocale } from '@/wallet/i18n/settings';
import { useTranslation } from '@/wallet/i18n/client';
import { useApiSetsEffects, type IApiSetSwitch } from '@ui/hooks/use-api-sets-effects';

export default function ClientEffects() {
  const { t } = useTranslation('common_wallet');
  useApiSetsEffects(({ node, selected, setTitle }: IApiSetSwitch) =>
    t('api_sets.node_unavailable', { selected, set: setTitle, node })
  );

  // Set default locale cookie if missing or invalid, and the document direction for RTL languages
  useEffect(() => {
    const locale = ensureLocaleCookie(defaultLocale, languages);
    document.body.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }, []);

  // Handle browser back/forward navigation in subdirectory deployments
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    if (basePath) {
      const handlePopState = () => {
        const pathWithoutBase = window.location.pathname.replace(basePath, '');
        if (pathWithoutBase.startsWith('/@')) {
          setTimeout(() => {
            window.location.replace(window.location.href);
          }, 0);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  return null;
}
