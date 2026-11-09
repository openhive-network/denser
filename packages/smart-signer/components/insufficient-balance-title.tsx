'use client';

import type { InsufficientBalance } from '@transaction/lib/transform-error';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

const INSUFFICIENT_BALANCE_TITLE_KEYS: Record<InsufficientBalance, string> = {
  rewards_already_claimed: 'broadcast_error.rewards_already_claimed',
  balance_too_low: 'broadcast_error.balance_too_low'
};

/** Error toast title for a broadcast the chain rejected for asking more than the account holds. */
export function InsufficientBalanceTitle({ reason }: { reason: InsufficientBalance }) {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <span data-testid="insufficient-balance-title" data-reason={reason}>
      {t(INSUFFICIENT_BALANCE_TITLE_KEYS[reason])}
    </span>
  );
}
