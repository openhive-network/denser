'use client';

import * as React from 'react';
import { type DialogProps } from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { Dialog, DialogContent } from '@ui/components/dialog';
import { cn } from '../lib/utils';
import { Icons } from './icons';

const Command = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive> & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive>>;
}) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
      className
    )}
    {...props}
  />
);

interface CommandDialogProps extends DialogProps {}

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input> & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.Input>>;
}) => (
  <div className="flex items-center border-b bg-background px-3" cmdk-input-wrapper="">
    <Icons.atSign className="mr-2 h-5 w-5 shrink-0 text-primary" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  </div>
);

const CommandList = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List> & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.List>>;
}) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
);

const CommandEmpty = ({
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty> & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.Empty>>;
}) => <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />;

const CommandGroup = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group> & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.Group>>;
}) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
      className
    )}
    {...props}
  />
);

const CommandSeparator = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator> & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.Separator>>;
}) => <CommandPrimitive.Separator ref={ref} className={cn('-mx-1 h-px bg-border', className)} {...props} />;

const CommandItem = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item> & {
  ref?: React.Ref<React.ElementRef<typeof CommandPrimitive.Item>>;
}) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  />
);

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)} {...props} />
  );
};
CommandShortcut.displayName = 'CommandShortcut';

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
};
