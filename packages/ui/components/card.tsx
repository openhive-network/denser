import * as React from 'react';

import { cn } from '@ui/lib/utils';

const Card = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>;
}) => (
  <div
    ref={ref}
    className={cn('rounded-md border bg-card text-card-foreground shadow-sm', className)}
    {...props}
  />
);

const CardHeader = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>;
}) => <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;

const CardTitle = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
  ref?: React.Ref<HTMLParagraphElement>;
}) => <h3 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />;

const CardDescription = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.Ref<HTMLParagraphElement>;
}) => <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />;

const CardContent = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>;
}) => <div ref={ref} className={cn('p-1', className)} {...props} />;

const CardFooter = ({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>;
}) => <div ref={ref} className={cn(' flex items-center p-1', className)} {...props} />;

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
