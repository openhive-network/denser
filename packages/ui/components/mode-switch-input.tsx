'use client';

import React, { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Bot, Search } from 'lucide-react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@ui/lib/utils';
import { useRouter } from 'next/router';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { Label } from '@ui/components/label';
import { useTranslation } from 'next-i18next';

interface ModeInputProps {
  className?: string;
  aiAvailable: boolean;
  isLoading: boolean;
  searchPage?: boolean;
}

export function ModeSwitchInput({ className, aiAvailable, isLoading, searchPage }: ModeInputProps) {
  const router = useRouter();
  const sort = router.query.s as string;
  const query = router.query.q as string;
  const [inputValue, setInputValue] = useState(query ?? '');
  const [mode, setMode] = useState<'ai' | 'search'>(!aiAvailable ? 'search' : 'ai');
  const { t } = useTranslation('common_blog');
  const onSubmit = (event: KeyboardEvent<HTMLInputElement>, value: string, mode: 'ai' | 'search') => {
    if (event.key === 'Enter') {
      switch (mode) {
        case 'ai':
          router.push(`/search?q=${encodeURIComponent(value)}`);
          break;
        case 'search':
          router.push(`/search?q=${encodeURIComponent(value)}&s=${sort ?? 'newest'}`);
          break;
      }
    }
  };

  useEffect(() => {
    if (aiAvailable && !router.query.s) {
      setMode('ai');
    }
  }, [aiAvailable, isLoading]);
  const inputRef = useRef<HTMLInputElement>(null);
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
          onKeyDown={(e) => onSubmit(e, inputValue, mode)}
        />
      </div>

      {searchPage && mode === 'search' ? (
        <Select
          defaultValue="newest"
          onValueChange={(value) => router.push(`/search?q=${encodeURIComponent(inputValue)}&s=${value}`)}
        >
          <Label>Sort by:</Label>
          <SelectTrigger className="w-[180px]" data-testid="search-sort-by-dropdown-list">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="newest">{t('select_sort.search_sorter.newest')}</SelectItem>
              <SelectItem value="popularity">{t('select_sort.search_sorter.popularity')}</SelectItem>
              <SelectItem value="relevance">{t('select_sort.search_sorter.relevance')}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

const ModeSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary',
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-10 data-[state=unchecked]:translate-x-0'
        )}
      >
        {props.checked ? <Search className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  );
});
ModeSwitch.displayName = 'ModeSwitch';
