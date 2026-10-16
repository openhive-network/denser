'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import type { NotEnoughRc } from '@transaction/lib/not-enough-rc';

/** Tells the user a broadcast was rejected for lack of Resource Credits, with the shortfall when known. */
export function NotEnoughRcMessage({ current, needed }: NotEnoughRc) {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, i18n, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  const formatRc = (rc: number) => rc.toLocaleString(i18n.language);
  return (
    <div className="text-white" data-testid="not-enough-rc-message">
      <p className="font-semibold">{t('broadcast_error.not_enough_rc')}</p>
      {current !== null && needed !== null ? (
        <p>{t('broadcast_error.not_enough_rc_amounts', { current: formatRc(current), needed: formatRc(needed) })}</p>
      ) : null}
    </div>
  );
}
