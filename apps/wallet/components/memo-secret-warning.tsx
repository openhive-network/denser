'use client';

import { Checkbox } from '@ui/components/checkbox';
import type { MemoSecretKind } from '@ui/lib/memo-secret-check';
import { useTranslation } from '@/wallet/i18n/client';

const OVERRIDE_ID = 'memo-secret-override';

const WARNING_KEYS: Record<MemoSecretKind, string> = {
  wif: 'transfers_page.memo_secret_wif',
  master_password: 'transfers_page.memo_secret_master_password'
};

export function MemoSecretWarning({
  kind,
  acknowledged,
  onAcknowledgedChange
}: {
  kind: MemoSecretKind;
  acknowledged: boolean;
  onAcknowledgedChange: (acknowledged: boolean) => void;
}) {
  const { t } = useTranslation('common_wallet');

  return (
    <div role="alert" data-testid="memo-secret-warning" className="flex flex-col gap-2 p-2 text-sm text-destructive">
      <p>{t(WARNING_KEYS[kind])}</p>
      <div className="flex items-start gap-2">
        <Checkbox
          id={OVERRIDE_ID}
          checked={acknowledged}
          onCheckedChange={(checked) => onAcknowledgedChange(checked === true)}
        />
        <label htmlFor={OVERRIDE_ID} className="text-xs leading-4">
          {t('transfers_page.memo_secret_override')}
        </label>
      </div>
    </div>
  );
}
