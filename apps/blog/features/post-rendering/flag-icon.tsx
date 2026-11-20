import React from 'react';
import { Icons } from '@ui/components/icons';
import { useTranslation } from '@/blog/i18n/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';

const FlagTooltip = React.forwardRef<HTMLButtonElement, { onClick: () => void }>(({ onClick }, ref) => {
  const { t } = useTranslation('common_blog');
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger ref={ref}>
          <Icons.flag className="h-4" onClick={onClick} />
        </TooltipTrigger>
        <TooltipContent>{t('post_content.flag.flag_post')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

FlagTooltip.displayName = 'FlagTooltip';

export default FlagTooltip;
