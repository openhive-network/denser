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
import { useRouter } from 'next/router';

function SearchSortSelect({ value }: { value: string }) {
  const { t } = useTranslation('common_blog');
  const router = useRouter();

  return (
    <Select
      defaultValue="newest"
      onValueChange={(sortValue) => router.push(`/search?q=${encodeURIComponent(value)}&s=${sortValue}`)}
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
  );
}
export default SearchSortSelect;
