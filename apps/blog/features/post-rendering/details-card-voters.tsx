'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@hive/ui/components/popover';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { useHoverPopover } from '@/blog/components/hooks/use-hover-popover';
import { useTranslation } from '@/blog/i18n/client';
import VotersDetailsData from './votes-details-data';

type DetailsCardVotersProps = {
  post: Entry;
  label: string;
  className?: string;
};

const DetailsCardVoters = ({ post, label, className }: DetailsCardVotersProps) => {
  const { t } = useTranslation('common_blog');
  const { rootProps, triggerProps, contentProps } = useHoverPopover();

  return (
    <Popover {...rootProps}>
      <PopoverTrigger
        className={className}
        data-testid="comment-votes"
        aria-label={t('post_content.footer.show_voters', { label })}
        {...triggerProps}
      >
        {label}
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col" {...contentProps}>
        <VotersDetailsData post={post} />
      </PopoverContent>
    </Popover>
  );
};

export default DetailsCardVoters;
