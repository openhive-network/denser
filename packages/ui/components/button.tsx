import * as React from 'react';
import { VariantProps, cva } from 'class-variance-authority';

import { cn } from '@ui/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-80',
        destructive:
          'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border hover:border-primary',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outlineRed:
          'border border-input hover:bg-accent hover:text-red-600 hover:border-red-600 border-slate-600 text-slate-600 dark:border-white dark:text-white',
        link: 'underline-offset-4 hover:underline text-primary',
        redHover:
          'text-base disabled:bg-gray-400 hover:bg-red-600 bg-gray-800 rounded-none text-white shadow-[3px_3px_0px_var(--tw-shadow-color)] shadow-red-600 hover:shadow-gray-800  disabled:shadow-none',
        basic: 'h-2 border-input text-black hover:text-red-600 dark:text-slate-200'
      },
      size: {
        default: 'h-10 py-2 px-4',
        xs: 'h6 px-1 rounded0md',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, type = 'button', size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} type={type} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
