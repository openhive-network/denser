import React from 'react';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';

const FlagTooltip = ({ onClick, ref }: { onClick: () => void; ref?: React.Ref<HTMLButtonElement> }) => {
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
};

export default FlagTooltip;
