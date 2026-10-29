import React, { KeyboardEvent, useCallback, useEffect, useRef } from 'react';
import { cn } from '@ui/lib/utils';
import { SearchMode, useSearch } from '@ui/hooks/use-search';
import SearchSortSelect from './search-select';
import ModeSelect from './mode-select';
import clsx from 'clsx';
import { Separator } from '@radix-ui/react-dropdown-menu';
import { Search } from 'lucide-react';
import type { TFunction } from 'i18next';

interface ModeInputProps {
  className?: string;
  searchPage?: boolean;
  aiAvailable: boolean;
  /** The app's translation function; the search box texts are under `search_mode` in its default namespace. */
  t: TFunction;
}

const PLACEHOLDER_KEYS: Record<SearchMode, string> = {
  ai: 'search_mode.placeholder.ai',
  classic: 'search_mode.placeholder.classic',
  account: 'search_mode.placeholder.account',
  userTopic: 'search_mode.placeholder.user_topic',
  tag: 'search_mode.placeholder.tag'
};

const INPUT_LABEL_KEYS: Record<SearchMode, string> = {
  ai: 'search_mode.input_label.ai',
  classic: 'search_mode.input_label.classic',
  account: 'search_mode.input_label.account',
  userTopic: 'search_mode.input_label.user_topic',
  tag: 'search_mode.input_label.tag'
};

export function ModeSwitchInput({ className, searchPage, aiAvailable, t }: ModeInputProps) {
  const { inputValue, setInputValue, secondInputValue, setSecondInputValue, mode, setMode, handleSearch } =
    useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const topicInputRef = useRef<HTMLInputElement>(null);
  const hasUserSelectedMode = useRef(false);

  // Auto-switch to AI mode when HiveSense becomes available,
  // but only if the user hasn't manually changed the mode and has no active query
  useEffect(() => {
    if (aiAvailable && mode === 'classic' && !hasUserSelectedMode.current && !inputValue) {
      setMode('ai');
    }
  }, [aiAvailable]);

  const handleModeChange = useCallback(
    (newMode: SearchMode) => {
      hasUserSelectedMode.current = true;
      setMode(newMode);
    },
    [setMode]
  );

  const onSearchClick = useCallback(() => {
    if (mode === 'userTopic') {
      handleSearch(secondInputValue, mode, inputValue);
    } else {
      handleSearch(inputValue, mode, secondInputValue);
    }
  }, [mode, inputValue, secondInputValue, handleSearch]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        onSearchClick();
      }
    },
    [onSearchClick]
  );
  return (
    <div className={cn('w-full', className)}>
      <div className="relative flex w-full items-center rounded-full border border-input bg-background ring-offset-background">
        <ModeSelect handleMode={handleModeChange} mode={mode} aiAvailable={aiAvailable} t={t} />
        <input
          disabled={!aiAvailable && mode === 'ai'}
          ref={inputRef}
          type="text"
          placeholder={t(PLACEHOLDER_KEYS[mode])}
          aria-label={t(INPUT_LABEL_KEYS[mode])}
          value={mode === 'userTopic' ? secondInputValue : inputValue}
          onChange={(e) =>
            mode === 'userTopic' ? setSecondInputValue(e.target.value) : setInputValue(e.target.value)
          }
          className={clsx(
            'z-10 block h-8 w-full bg-transparent p-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
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
              ref={topicInputRef}
              type="text"
              placeholder={t('search_mode.placeholder.topic')}
              aria-label={t('search_mode.input_label.topic')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="z-10 block h-8 w-full bg-transparent p-2 pl-0 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
              onKeyDown={onKeyDown}
            />
          </>
        ) : null}
        <button
          type="button"
          onClick={onSearchClick}
          disabled={!aiAvailable && mode === 'ai'}
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground ring-offset-background transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('search_mode.search')}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {searchPage && (mode === 'classic' || mode === 'userTopic') && (
        <SearchSortSelect value={inputValue} secondValue={secondInputValue} mode={mode} />
      )}
    </div>
  );
}
