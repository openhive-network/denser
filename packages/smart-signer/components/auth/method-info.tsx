import { FC } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@hive/ui';
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
 */
const MethodInfo: FC<MethodInfoProps> = ({ label, info, testId }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground"
        data-testid={testId}
      >
        <Icons.info className="h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs" data-testid={`${testId}-content`}>
        {info}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default MethodInfo;
