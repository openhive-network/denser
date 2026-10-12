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
        <TooltipContent side="bottom">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export default TooltipContainer;
