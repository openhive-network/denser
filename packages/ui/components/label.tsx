'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { VariantProps, cva } from 'class-variance-authority';

import { cn } from '@ui/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

const Label = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants> & {
    ref?: React.Ref<React.ElementRef<typeof LabelPrimitive.Root>>;
  }) => <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />;

export { Label };
