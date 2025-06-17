import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';

const FlagTooltip = ({ onClick }: { onClick: () => void }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Icons.flag className="h-4" onClick={onClick} />
        </TooltipTrigger>
        <TooltipContent>Flag post</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FlagTooltip;
