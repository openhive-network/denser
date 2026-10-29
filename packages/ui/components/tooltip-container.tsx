'use client';

import { memo, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';

const TooltipContainer = memo(function TooltipContainer({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <TooltipProvider>
      {/* Plain labels: hoverable content only closes on a later pointermove, so it could stick open */}
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        {/* Closed before its enter animation started, Radix would keep it mounted until that animation
            ends, still open to a reader who has tabbed on; without an animation once closed it unmounts at once. */}
        <TooltipContent side="bottom" className="data-[state=closed]:animate-none">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export default TooltipContainer;
