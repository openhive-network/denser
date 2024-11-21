import React, { useEffect, FC, useState } from 'react';
import { Input } from '@ui/components/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components';
import { cn } from '@ui/lib/utils';

const NumberInput: FC<{
  value: number;
  onChange: (value: number) => void;
  className: string;
  id?: string;
}> = ({ value, onChange, className, id }) => {
  const [error, setError] = useState(false);
  const [focus, setFocus] = useState(false);
  const [innerValue, setInnerValue] = useState(value.toString());
  useEffect(() => {
    setInnerValue(value.toString());
  }, [value]);
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={!error ? false : focus ? true : undefined}>
        <TooltipTrigger asChild>
          <Input
            id={id}
            value={innerValue}
            onChange={(e) => {
              setInnerValue(e.target.value);
              const value = Number(e.target.value);
              if (isNaN(value)) {
                setError(true);
                e.target.setCustomValidity('Not a number');
                return;
              }
              setError(false);
              onChange(value);
            }}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            className={cn(className, 'self-center justify-self-center bg-white/10 p-0 px-3', {
              'border-red-500 focus-visible:ring-red-500': error
            })}
          />
        </TooltipTrigger>
        <TooltipContent>Not a number</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
export default NumberInput;
