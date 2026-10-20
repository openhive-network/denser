import { FC, MouseEvent, useState } from 'react';
import { Tooltip, TooltipContent, TooltipPortal, TooltipProvider, TooltipTrigger } from '@hive/ui';
import { Icons } from '@hive/ui/components/icons';

export interface MethodInfoProps {
  /** Name of the sign-in method, for the trigger's accessible label. */
  label: string;
  info: string;
  testId: string;
}

/**
 * Info icon with a tooltip describing a sign-in method. Render it next to the method's button, not
 * inside it: a disabled button swallows the pointer events its tooltip needs.
 *
 * The tooltip opens on hover and focus, and also on click, so a tap opens it on touch screens.
 * It is portalled to the body: the sign-in form scrolls, and would clip it. It opens to the left and
 * closes as soon as the pointer leaves the icon, so it never covers the info icon of the next method.
 */
const MethodInfo: FC<MethodInfoProps> = ({ label, info, testId }) => {
  const [open, setOpen] = useState(false);

  // Radix closes a tooltip on a click of its trigger; preventing the default keeps it open instead
  const openOnClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpen(true);
  };

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen} disableHoverableContent>
        <TooltipTrigger
          type="button"
          aria-label={label}
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground"
          data-testid={testId}
          onClick={openOnClick}
        >
          <Icons.info className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="left" className="max-w-xs" data-testid={`${testId}-content`}>
            {info}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MethodInfo;
