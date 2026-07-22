'use client';

import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { useGDWTranslation } from '../i18n/context';

interface StepAccountNameProps {
  accountName: string;
  onAccountNameChange: (value: string) => void;
  disabled: boolean;
}

export function StepAccountName({ accountName, onAccountNameChange, disabled }: StepAccountNameProps) {
  const { t } = useGDWTranslation();

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">
        {t('google_drive_wallet.create_dialog.account_name_label')}
      </Label>
      <Input
        value={accountName}
        onChange={(e) => onAccountNameChange(e.target.value)}
        placeholder={t('google_drive_wallet.create_dialog.account_placeholder')}
        disabled={disabled}
        autoFocus
      />
      <p className="text-xs text-muted-foreground">
        {t('google_drive_wallet.create_dialog.account_name_hint')}
      </p>
    </div>
  );
}
