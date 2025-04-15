import { Bot, Search } from 'lucide-react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@ui/lib/utils';
import { ComponentPropsWithoutRef, ElementRef, forwardRef } from 'react';

const ModeSwitch = forwardRef<
  ElementRef<typeof SwitchPrimitives.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary',
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-10 data-[state=unchecked]:translate-x-0'
        )}
      >
        {props.checked ? <Search className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  );
});
ModeSwitch.displayName = 'ModeSwitch';

export default ModeSwitch;
