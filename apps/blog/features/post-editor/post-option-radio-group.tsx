import { Label } from '@ui/components/label';
import { RadioGroup, RadioGroupItem } from '@ui/components/radio-group';
import clsx from 'clsx';

interface PostOption {
  value: string;
  label: string;
}

interface PostOptionRadioGroupProps {
  labelledBy: string;
  options: PostOption[];
  value: string;
  onValueChange: (value: string) => void;
  testIdPrefix: string;
  disabled?: boolean;
}

/**
 * Single-choice group rendered as pill labels. The radio itself is visually
 * hidden but stays in the tab order (one stop per group, arrows move the
 * selection); its focus ring is drawn on the sibling label.
 */
export function PostOptionRadioGroup({
  labelledBy,
  options,
  value,
  onValueChange,
  testIdPrefix,
  disabled
}: PostOptionRadioGroupProps) {
  return (
    <RadioGroup
      aria-labelledby={labelledBy}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      className="my-3 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:justify-center"
    >
      {options.map((option) => (
        <div key={option.value} className="relative text-center">
          <RadioGroupItem
            id={option.value}
            value={option.value}
            className="peer sr-only"
            data-testid={`${testIdPrefix}-${option.value}`}
          />
          <Label
            htmlFor={option.value}
            className={clsx(
              'inline-block cursor-pointer rounded-lg border p-2 ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
              {
                'border-destructive bg-border': value === option.value,
                'text-muted-foreground': value !== option.value
              }
            )}
          >
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
