'use client';

import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import TooltipContainer from '@ui/components/tooltip-container';
import { cn } from '@ui/lib/utils';
import { Link } from '@hive/ui';

const SearchButton = ({ aiTag, className }: { aiTag: boolean; className?: string }) => {
  return (
    <TooltipContainer title={`${aiTag ? 'AI ' : ''}Search`}>
      <Link href="/search" data-testid="navbar-search-link">
        <Button variant="ghost" size="sm" className={cn('relative h-10 w-10 px-0', className)}>
          <Icons.search className="h-5 w-5 rotate-90" />
          {aiTag ? <span className="absolute bottom-0 right-2 text-[10px] font-bold">AI</span> : null}
        </Button>
      </Link>
    </TooltipContainer>
  );
};

export default SearchButton;
