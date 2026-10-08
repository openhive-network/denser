import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';

export const TooltipContainer = ({
  children,
  loading,
  text,
  dataTestId,
  afterPayout
}: {
  children: ReactNode;
  loading: boolean;
  text: string;
  dataTestId: string;
  afterPayout?: boolean;
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger data-testid={dataTestId} disabled={loading} asChild>
          <span className="cursor-pointer">{children}</span>
        </TooltipTrigger>
        <TooltipContent
          data-testid={dataTestId + '-tooltip'}
          className="flex flex-col items-center justify-center"
        >
          <div className="font-bold">{text}</div>
          {afterPayout && (
            <div className="text-xs text-destructive opacity-80">
              Voting on Content after their payout does not generate any new rewards
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
