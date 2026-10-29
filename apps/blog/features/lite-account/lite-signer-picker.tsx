'use client';

import { Label } from '@ui/components/label';
import { RadioGroup, RadioGroupItem } from '@ui/components/radio-group';
import { useTranslation } from '@/blog/i18n/client';
import { signerHostname } from './use-lite-passkey';

type Props = {
  signers: readonly string[];
  value: string;
  onValueChange: (origin: string) => void;
  disabled?: boolean;
};

/** The configured passkey signers to pick from, by hostname; nothing when there is only one to use. */
export default function LiteSignerPicker({ signers, value, onValueChange, disabled }: Props) {
  const { t } = useTranslation('common_blog');
  if (signers.length < 2) return null;

  return (
    <div className="flex flex-col gap-2" data-testid="lite-signer-picker">
      <span id="lite-signer-picker-label" className="text-sm font-medium">
        {t('lite_account.passkey.pick_signer')}
      </span>
      <RadioGroup
        aria-labelledby="lite-signer-picker-label"
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        {signers.map((origin) => (
          <div key={origin} className="flex items-center gap-2">
            <RadioGroupItem
              id={`lite-signer-${origin}`}
              value={origin}
              data-testid="lite-signer-option"
              data-origin={origin}
            />
            <Label htmlFor={`lite-signer-${origin}`} translate="no">
              {signerHostname(origin)}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
