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
import { SearchSort, useSearch } from '@ui/hooks/useSearch';

function SearchSortSelect({ value, secondValue }: { value: string; secondValue: string }) {
  const { t } = useTranslation('common_blog');
  const { handleSearch, sortQuery } = useSearch();

  return (
    <Select
      defaultValue={sortQuery ?? 'relevance'}
      onValueChange={(sortValue) => handleSearch(value, secondValue, sortValue as SearchSort)}
    >
      <Label>Sort by:</Label>
      <SelectTrigger className="w-[180px]" data-testid="search-sort-by-dropdown-list">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="created">{t('select_sort.search_sorter.newest')}</SelectItem>
          <SelectItem value="relevance">{t('select_sort.search_sorter.relevance')}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
export default SearchSortSelect;
