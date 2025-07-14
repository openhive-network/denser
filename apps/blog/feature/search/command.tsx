import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '@ui/lib/utils';

interface CommandInputProps extends React.ComponentProps<typeof CommandPrimitive.Input> {
  containterClassName?: string;
}
function CommandInput({ className, containterClassName, ...props }: CommandInputProps) {
  return (
    <div
      data-slot="command-input-wrapper"
      className={cn(
        'flex h-8 items-center gap-2 rounded-r-full border-y border-r border-destructive px-3',
        containterClassName
      )}
    >
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  );
}

export { CommandInput };
