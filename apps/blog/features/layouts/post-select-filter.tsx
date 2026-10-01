'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '../../i18n/client';
import { useFeedNavigation } from './sorts/feed-navigation-context';

const PostSelectFilter = ({ param }: { param?: string }) => {
  const { t } = useTranslation('common_blog');
  const router = useRouter();
  const feedNavigation = useFeedNavigation();
  const path = usePathname();
  // Root (/) serves the trending feed via the middleware rewrite, so its first
  // path segment is empty — treat that as /trending so the filter shows "Trending".
  const segment = path?.split('/')[1];
  const currentPath = segment ? `/${segment}` : '/trending';
  const onValueChange = (next: string) => {
    const href = param ? `${next}/${param}` : next;
    if (feedNavigation) {
      feedNavigation.navigate(href);
    } else {
      router.push(href);
    }
  };
  return (
    <Select value={currentPath} onValueChange={onValueChange}>
      <SelectTrigger className="bg-background" data-testid="posts-filter">
        <SelectValue placeholder={t('select_sort.posts_sort.trending')} />
      </SelectTrigger>
      <SelectContent data-testid="posts-filter-list">
        <SelectGroup>
          <SelectItem value="/trending">{t('select_sort.posts_sort.trending')}</SelectItem>
          <SelectItem value="/hot">{t('select_sort.posts_sort.hot')}</SelectItem>
          <SelectItem value="/created">{t('select_sort.posts_sort.new')}</SelectItem>
          <SelectItem value="/payout">{t('select_sort.posts_sort.payouts')}</SelectItem>
          <SelectItem value="/muted">{t('select_sort.posts_sort.muted')}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default PostSelectFilter;
