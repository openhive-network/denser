'use client';

import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import TooltipContainer from '@ui/components/tooltip-container';
import { cn } from '@ui/lib/utils';
import { Link } from '@hive/ui';

const SearchButton = ({ aiTag, className }: { aiTag: boolean; className?: string }) => {
  const searchLabel = `${aiTag ? 'AI ' : ''}Search`;
  return (
    <TooltipContainer title={searchLabel}>
      <Link href="/search" data-testid="navbar-search-link">
        <Button variant="ghost" size="sm" className={cn('relative h-10 w-10 px-0', className)} aria-label={searchLabel}>
          <Icons.search className="h-5 w-5 rotate-90" aria-hidden="true" />
          {aiTag ? <span className="absolute bottom-0 right-2 text-[10px] font-bold" aria-hidden="true">AI</span> : null}
        </Button>
      </Link>
    </TooltipContainer>
  );
};

export default SearchButton;
