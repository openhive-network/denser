'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/** Error toast title: the text of `titleKey`, a smart-signer translation key. */
export function ErrorToastTitle({ titleKey }: { titleKey: string }) {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <span data-testid="error-toast-title" data-title-key={titleKey}>
      {t(titleKey)}
    </span>
  );
}
