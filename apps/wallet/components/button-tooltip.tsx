import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Button } from '@ui/components';
import { ReactNode } from 'react';

const ButtonTooltip = ({ children, label }: { children: ReactNode; label: string }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ButtonTooltip;
