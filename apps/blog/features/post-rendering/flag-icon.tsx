import React from 'react';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';

const FlagTooltip = React.forwardRef<HTMLButtonElement, { onClick: () => void }>(({ onClick }, ref) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger ref={ref}>
          <Icons.flag className="h-4" onClick={onClick} />
        </TooltipTrigger>
        <TooltipContent>Flag post</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

FlagTooltip.displayName = 'FlagTooltip';

export default FlagTooltip;
