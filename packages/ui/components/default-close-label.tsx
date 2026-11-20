'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';

/** The app's translated `global.close`, which both apps' default namespace carries. */
export const DefaultCloseLabel = () => {
  const { t } = useSharedTranslation(undefined, { useSuspense: false });
  return <>{t('global.close', { defaultValue: 'Close' })}</>;
};
