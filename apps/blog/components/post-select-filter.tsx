import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { useTranslation } from 'next-i18next';
import { memo, useCallback, useEffect, useState } from 'react';

const PostSelectFilter = memo(({
  filter,
  handleChangeFilter
}: {
  filter: string | null;
  handleChangeFilter: (e: string) => void;
}) => {
  const { t } = useTranslation('common_blog');
  const defaultValue = 'trending';
  const [currentValue, setCurrentValue] = useState(filter || defaultValue);

  // Keep local state in sync with prop using useCallback
  const updateCurrentValue = useCallback((newFilter: string | null) => {
    setCurrentValue(newFilter || defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    updateCurrentValue(filter);
  }, [filter, updateCurrentValue]);

  const handleValueChange = useCallback((value: string) => {
    setCurrentValue(value);
    handleChangeFilter(value);
  }, [handleChangeFilter]);

  return (
    <Select
      value={currentValue}
      onValueChange={handleValueChange}
      defaultValue={defaultValue}
    >
      <SelectTrigger className="bg-background" data-testid="posts-filter">
        <SelectValue placeholder={t('select_sort.posts_sort.trending')} />
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
});

PostSelectFilter.displayName = 'PostSelectFilter';

export default PostSelectFilter;
