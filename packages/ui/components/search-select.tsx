'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { Label } from '@ui/components/label';
import { SearchMode, SearchSort, useSearch } from '@ui/hooks/use-search';

function SearchSortSelect({
  value,
  secondValue,
  mode
}: {
  value: string;
  secondValue: string;
  mode: SearchMode;
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
      <Label>Sort by:</Label>
      <SelectTrigger className="w-[180px]" data-testid="search-sort-by-dropdown-list">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="created">Newest</SelectItem>
          <SelectItem value="relevance">Relevance</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
export default SearchSortSelect;
