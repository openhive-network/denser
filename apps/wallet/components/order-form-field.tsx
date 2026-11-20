'use client';

import { useId, useState } from 'react';
import { Input } from '@ui/components/input';
import { useLocale } from '@ui/components/locale-context';
import { withDecimalPoint } from '@/wallet/lib/decimal-input';
import { useTranslation } from '@/wallet/i18n/client';

const TYPED_AMOUNT_PATTERN = /^\d*\.?\d*$/;

/**
 * One numeric field of the market order form. Its accessible name joins the form heading
 * (`headingId`, the order side), the visible label and the unit, e.g. "Buy HIVE Price HBD/HIVE".
 */
export default function OrderFormField({
  headingId,
  label,
  unit,
  value,
  onChange,
  testId,
  errorId
}: {
  headingId: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
  /** Id of the error describing this field; marks the field invalid when set. */
  errorId?: string;
}) {
  const { t } = useTranslation('common_wallet');
  const { locale } = useLocale();
  const inputId = useId();
  const labelId = useId();
  const unitId = useId();
  const misreadId = useId();
  // Text whose separators are no decimal separator of the locale (en "1,000"): shown as typed and
  // refused, with the field's value emptied, rather than dropping the comma into "1000".
  const [misread, setMisread] = useState<string | null>(null);
  // A value set from outside (the total recomputing the amount) replaces the refused text.
  if (misread !== null && value !== '') setMisread(null);
  const handleChange = (typed: string) => {
    const unsigned = typed.replaceAll('-', '');
    const amount = withDecimalPoint(unsigned, locale);
    if (amount === null) {
      setMisread(unsigned);
      onChange('');
      return;
    }
    if (!TYPED_AMOUNT_PATTERN.test(amount)) return;
    setMisread(null);
    onChange(amount);
  };
  const describedBy = misread !== null ? misreadId : errorId;
  return (
    <>
      <div className="flex w-full justify-between text-sm">
        <label id={labelId} htmlFor={inputId} className="flex w-24 items-center" data-testid={`${testId}-label`}>
          {label}
        </label>
        <div className="flex w-full">
          <Input
            id={inputId}
            aria-labelledby={`${headingId} ${labelId} ${unitId}`}
            aria-invalid={describedBy ? true : undefined}
            aria-describedby={describedBy}
            className="h-8 rounded-none text-end focus-visible:ring-0"
            placeholder="0.0"
            value={misread ?? value}
            type="text"
            inputMode="decimal"
            data-testid={`${testId}-input`}
            onChange={(e) => handleChange(e.target.value)}
          />
          <div id={unitId} className="flex w-28 items-center justify-center bg-background-secondary">
            {unit}
          </div>
        </div>
      </div>
      {misread !== null ? (
        <p id={misreadId} role="alert" className="text-end text-xs text-destructive" data-testid={`${testId}-error`}>
          {t('market_page.invalid_number')}
        </p>
      ) : null}
    </>
  );
}
