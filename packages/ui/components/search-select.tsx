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
import { SearchMode, SearchSort, useSearch } from '@ui/hooks/useSearch';

function SearchSortSelect({
  value,
  secondValue,
  mode
}: {
  value: string;
  secondValue: string;
  mode: SearchMode;
}) {
  const { t } = useTranslation('common_blog');
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
          <SelectItem value="created">{t('select_sort.search_sorter.newest')}</SelectItem>
          <SelectItem value="relevance">{t('select_sort.search_sorter.relevance')}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
export default SearchSortSelect;
