'use client';

import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { useTranslation } from '@/blog/i18n/client';

interface StepAccountNameProps {
  accountName: string;
  onAccountNameChange: (value: string) => void;
  disabled: boolean;
}

export function StepAccountName({ accountName, onAccountNameChange, disabled }: StepAccountNameProps) {
  const { t } = useTranslation('common_blog');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          1
        </div>
        <Label className="text-base font-semibold">
          {t('google_drive_wallet.create_dialog.account_name_label')}
        </Label>
      </div>
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
