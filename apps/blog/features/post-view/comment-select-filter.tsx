'use client';

import { useTranslation } from '@/blog/i18n/client';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { useRouter, useSearchParams } from 'next/navigation';

const CommentSelectFilter = () => {
  const router = useRouter();
  const sort = useSearchParams()?.get('sort');
  const { t } = useTranslation('common_blog');
  return (
    <Select
      defaultValue={sort ? sort : 'trending'}
      onValueChange={(e) => {
        router.replace(`${window.location.pathname}?sort=${e}#comments`);
      }}
    >
      <SelectTrigger className="h-5 w-fit border-none bg-transparent text-red-600" data-testid="posts-filter">
        <SelectValue placeholder="Sort:" />
      </SelectTrigger>
      <SelectContent data-testid="posts-filter-list">
        <SelectGroup>
          <SelectItem value="trending">{t('select_sort.sort_comments.trending')}</SelectItem>
          <SelectItem value="votes">{t('select_sort.sort_comments.votes')}</SelectItem>
          <SelectItem value="new">{t('select_sort.sort_comments.age')}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default CommentSelectFilter;
