'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@ui/lib/utils';

const Progress = ({
  className,
  value,
  indicatorClassName,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
  ref?: React.Ref<React.ElementRef<typeof ProgressPrimitive.Root>>;
}) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-4 w-full overflow-hidden rounded-full bg-slate-300', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn('h-full w-full flex-1 bg-red-600 transition-all', indicatorClassName)}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
);

export { Progress };
