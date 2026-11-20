'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import type { TFunction } from 'i18next';
import { Label } from '@ui/components/label';
import { SearchMode, SearchSort, useSearch } from '@ui/hooks/use-search';

function SearchSortSelect({
  value,
  secondValue,
  mode,
  t
}: {
  value: string;
  secondValue: string;
  mode: SearchMode;
  /** The app's translation function: this package owns no locale files. */
  t: TFunction;
}) {
  const { handleSearch, sortQuery } = useSearch();
  const onValueChange = (sortValue: SearchSort) => {
    if (mode === 'userTopic') {
      handleSearch(secondValue, mode, value, sortValue);
    } else {
      handleSearch(value, mode, secondValue, sortValue);
    }
  };
  return (
    <Select value={sortQuery ?? 'relevance'} onValueChange={onValueChange}>
      <Label>{t('search_mode.sort_by', { ns: 'common_blog' })}</Label>
      <SelectTrigger className="w-[180px]" data-testid="search-sort-by-dropdown-list">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="created">{t('select_sort.search_sorter.newest', { ns: 'common_blog' })}</SelectItem>
          <SelectItem value="relevance">{t('select_sort.search_sorter.relevance', { ns: 'common_blog' })}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
export default SearchSortSelect;
