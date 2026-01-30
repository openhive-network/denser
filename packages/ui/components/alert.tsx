import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@ui/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:text-foreground [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'text-destructive border-destructive/50 dark:border-destructive [&>svg]:text-destructive text-destructive',
        success:
          'text-green-500 border-green-500/50 dark:border-green-500 [&>svg]:text-green-500 text-green-500'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

const Alert = ({
  className,
  variant,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    ref?: React.Ref<HTMLDivElement>;
  }) => <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;

const AlertTitle = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
  ref?: React.Ref<HTMLParagraphElement>;
}) => <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />;

const AlertDescription = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.Ref<HTMLParagraphElement>;
}) => <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />;

export { Alert, AlertTitle, AlertDescription };
