'use client';

import { buttonVariants } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import TooltipContainer from '@ui/components/tooltip-container';
import { cn } from '@ui/lib/utils';
import { Link } from '@hive/ui';
import { useTranslation } from '@/blog/i18n/client';

/** The search page link, styled as an icon button: one tab stop, hidden (so unfocusable) with `className` */
const SearchButton = ({ aiTag, className }: { aiTag: boolean; className?: string }) => {
  const { t } = useTranslation('common_blog');
  const label = t(aiTag ? 'search_mode.mode.ai' : 'search_mode.search');

  return (
    <TooltipContainer title={label}>
      <Link
        href="/search"
        aria-label={label}
        data-testid="navbar-search-link"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'relative h-10 w-10 px-0', className)}
      >
        <Icons.search className="h-5 w-5 rotate-90" aria-hidden="true" />
        {aiTag ? (
          <span className="absolute bottom-0 right-2 text-[10px] font-bold" aria-hidden="true">
            AI
          </span>
        ) : null}
      </Link>
    </TooltipContainer>
  );
};

export default SearchButton;
