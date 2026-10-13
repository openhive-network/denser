'use client';

import { useId } from 'react';
import { Input } from '@ui/components/input';

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
  const inputId = useId();
  const labelId = useId();
  const unitId = useId();
  return (
    <div className="flex w-full justify-between text-sm">
      <label id={labelId} htmlFor={inputId} className="flex w-24 items-center" data-testid={`${testId}-label`}>
        {label}
      </label>
      <div className="flex w-full">
        <Input
          id={inputId}
          aria-labelledby={`${headingId} ${labelId} ${unitId}`}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
          className="h-8 rounded-none text-end focus-visible:ring-0"
          placeholder="0.0"
          value={value}
          type="number"
          data-testid={`${testId}-input`}
          onChange={(e) => onChange(e.target.value.replaceAll('-', ''))}
        />
        <div id={unitId} className="flex w-28 items-center justify-center bg-background-secondary">
          {unit}
        </div>
      </div>
    </div>
  );
}
