import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { useTranslation } from 'next-i18next';

const PostSelectFilter = ({
  filter,
  handleChangeFilter
}: {
  filter: string | null;
  handleChangeFilter: (e: string) => void;
}) => {
  const { t } = useTranslation('common_blog');
  const defaultValue = 'trending';
  return (
    <Select
      defaultValue={defaultValue}
      value={filter ? filter : defaultValue}
      onValueChange={(e) => {
        handleChangeFilter(e);
      }}
    >
      <SelectTrigger className="bg-background" data-testid="posts-filter">
        <SelectValue placeholder="Select a filter" />
      </SelectTrigger>
      <SelectContent data-testid="posts-filter-list">
        <SelectGroup>
          <SelectItem value="trending">{t('select_sort.posts_sort.trending')}</SelectItem>
          <SelectItem value="hot">{t('select_sort.posts_sort.hot')}</SelectItem>
          <SelectItem value="created">{t('select_sort.posts_sort.new')}</SelectItem>
          <SelectItem value="payout">{t('select_sort.posts_sort.payouts')}</SelectItem>
          <SelectItem value="muted">{t('select_sort.posts_sort.muted')}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default PostSelectFilter;
