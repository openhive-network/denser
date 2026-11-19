'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@ui/components/locale-context';
import { ensureLocaleCookie } from '@ui/lib/locale-cookie';
import { browserLanguages, pickSupportedLocale } from '@ui/lib/locale-negotiation';
import { languages, defaultLocale } from '@/wallet/i18n/settings';
import { useTranslation } from '@/wallet/i18n/client';
import { useApiSetsEffects, type IApiSetSwitch } from '@ui/hooks/use-api-sets-effects';

export default function ClientEffects() {
  const router = useRouter();
  const { locale: renderedLocale } = useLocale();
  const { t } = useTranslation('common_wallet');
  useApiSetsEffects(({ node, selected, setTitle }: IApiSetSwitch) =>
    t('api_sets.node_unavailable', { selected, set: setTitle, node })
  );

  // Set the locale cookie, to the browser's language, if missing or invalid, and the document
  // direction for RTL languages
  useEffect(() => {
    const locale = ensureLocaleCookie(pickSupportedLocale(browserLanguages(), languages) ?? defaultLocale, languages);
    document.body.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    if (locale !== renderedLocale) {
      document.documentElement.lang = locale;
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
