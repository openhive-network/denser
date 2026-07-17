import React from 'react';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from '@/blog/i18n/client';

const FlagTooltip = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<'button'>>(
  ({ className, ...props }, ref) => {
    const { t } = useTranslation('common_blog');
    const label = t('post_content.flag.flag_post');
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            ref={ref}
            type="button"
            className={`border-0 bg-transparent p-0 ${className ?? ''}`}
            aria-label={label}
            {...props}
          >
            <Icons.flag className="h-4" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

FlagTooltip.displayName = 'FlagTooltip';

export default FlagTooltip;
