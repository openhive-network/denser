'use client';

import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';

type Props = {
  id: string;
  label: string;
  hint: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

/** lite_account caps a member's `meta` at 2048 bytes; a label stays well under it. */
const MAX_KEY_LABEL_LENGTH = 64;

/** An editable label of a key member, with a hint saying which key it names; its test id is `id`. */
export default function LiteKeyLabelField({ id, label, hint, value, disabled, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        maxLength={MAX_KEY_LABEL_LENGTH}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onChange(e.target.value)}
        data-testid={id}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}
