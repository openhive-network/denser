/* eslint-disable @next/next/no-img-element */
import { useId } from 'react';
import { RadioGroupItem as RadioGroupItemRoot } from '@ui/components/radio-group';

export interface IRadioGroupItem {
  value: string;
  disabled: boolean;
  labelText: string;
  labelImageSrc: string;
  labelImageAlt: string;
}

export interface RadioGroupItemProps {
  item: IRadioGroupItem,
  randomValue?: string // needed to keep radio inputs' ids unique on html page
}

export function RadioGroupItem({
  item,
  randomValue
}: RadioGroupItemProps): JSX.Element {
  const uniqueId = useId();
  const idSuffix = randomValue || uniqueId;
  return (
    <div className="flex align-items: center">
      <RadioGroupItemRoot
        value={item.value}
        className="border-2 border-gray-600 focus:ring-transparent"
        id={`radio-${item.value}-${idSuffix}`}
        disabled={item.disabled}
      />
      <label
        className="ml-2 flex items-center text-sm font-medium text-gray-900 dark:text-slate-300"
        htmlFor={`radio-${item.value}-${idSuffix}`}
      >
        {item.labelImageSrc && (
          <img
            className="mr-1 h-4 w-4"
            src={item.labelImageSrc}
            alt={item.labelImageAlt}
          />
        )}
        {item.labelText}
      </label>
    </div>
  );
}

export function radioGroupItems (
  items: IRadioGroupItem[]
): JSX.Element[] {
  const radioGroupItems: JSX.Element[] = [];
  items.forEach((item: IRadioGroupItem, index: number) => {
    const element = (
      <RadioGroupItem
        item={item}
        key={index}
      />
    );
    radioGroupItems.push(element);
  });
  return radioGroupItems;
}
