import React, { KeyboardEvent, useRef } from 'react';
import { cn } from '@ui/lib/utils';
import { useSearch } from '@ui/hooks/useSearch';
import ModeSwitch from './search-switch';
import SearchSortSelect from './search-select';

interface ModeInputProps {
  className?: string;
  aiAvailable: boolean;
  isLoading: boolean;
  searchPage?: boolean;
}

export function ModeSwitchInput({ className, aiAvailable, isLoading, searchPage }: ModeInputProps) {
  const { inputValue, setInputValue, mode, setMode, handleSearch } = useSearch(aiAvailable);
  const inputRef = useRef<HTMLInputElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch(inputValue, mode);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="relative flex w-full items-center rounded-full border border-input bg-background ring-offset-background">
        <div>
          <ModeSwitch
            disabled={!aiAvailable || isLoading}
            checked={mode === 'search'}
            onCheckedChange={() => setMode((prev) => (prev === 'ai' ? 'search' : 'ai'))}
            className="h-10 w-20 px-[2px]"
          />
        </div>
        <input
          disabled={isLoading}
          ref={inputRef}
          type="text"
          placeholder={mode === 'ai' ? 'AI Search' : 'Search'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="z-10 block h-10 w-full bg-transparent p-4 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          onKeyDown={onKeyDown}
        />
      </div>

      {searchPage && mode === 'search' && <SearchSortSelect value={inputValue} />}
    </div>
  );
}
