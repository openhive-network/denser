import React, { KeyboardEvent, useRef } from 'react';
import { cn } from '@ui/lib/utils';
import { SearchMode, useSearch } from '@ui/hooks/useSearch';
import SearchSortSelect from './search-select';
import ModeSelect from './mode-select';
import clsx from 'clsx';
import { Separator } from '@radix-ui/react-dropdown-menu';

interface ModeInputProps {
  className?: string;
  searchPage?: boolean;
  aiAvailable: boolean;
}
export const getPlaceholder = (value: SearchMode) => {
  switch (value) {
    case 'ai':
      return 'AI Search...';
    case 'classic':
      return 'Search...';
    case 'account':
      return 'Search users...';
    case 'userTopic':
      return 'Username...';
    case 'tag':
      return 'Search tags...';
    default:
      return 'Search something...';
  }
};

export function ModeSwitchInput({ className, searchPage, aiAvailable }: ModeInputProps) {
  const { inputValue, setInputValue, secondInputValue, setSecondInputValue, mode, setMode, handleSearch } =
    useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch(inputValue, secondInputValue);
    }
  };
  const placeholder = getPlaceholder(mode);
  return (
    <div className={cn('w-full', className)}>
      <div className="relative flex w-full items-center rounded-full border border-input bg-background ring-offset-background">
        <ModeSelect handleMode={(e) => setMode(e)} mode={mode} aiAvailable={aiAvailable} />
        <input
          disabled={(!aiAvailable && mode === 'ai') || mode === 'userTopic' || mode === 'classic'}
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className={clsx(
            'z-10 block h-8 w-full bg-transparent p-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            {
              'w-24 pr-0': mode === 'userTopic'
            }
          )}
          onKeyDown={onKeyDown}
        />
        {mode === 'userTopic' ? (
          <>
            <Separator className="mx-1 h-4 w-px bg-primary" />
            <input
              // Not supported yet
              disabled={true}
              ref={inputRef}
              type="text"
              placeholder="Topic..."
              value={secondInputValue}
              onChange={(e) => setSecondInputValue(e.target.value)}
              className="z-10 block h-8 w-full bg-transparent p-2 pl-0 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              onKeyDown={onKeyDown}
            />
          </>
        ) : null}
      </div>
      {searchPage && (mode === 'classic' || mode === 'userTopic') && (
        <SearchSortSelect value={inputValue} secondValue={secondInputValue} />
      )}
    </div>
  );
}
