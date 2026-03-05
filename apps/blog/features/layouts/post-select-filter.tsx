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
import {
  getSidechainRewardsConfig,
  getSidechainRewardsFeedTag,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';

const PostSelectFilter = ({ param }: { param?: string }) => {
  const { t } = useTranslation('common_blog');
  const router = useRouter();
  const path = usePathname();
  const sidechainConfig = getSidechainRewardsConfig();
  const isSidechainConfigured = isSidechainRewardsConfigured(sidechainConfig);
  const heCommunityTag = getSidechainRewardsFeedTag(sidechainConfig);
  const hePayoutPath = heCommunityTag ? `/he-payout/${heCommunityTag}` : '/he-payout';
  const defaultPath = isSidechainConfigured ? '/he-payout' : '/trending';
  const currentPathRaw = path ? `/${path.split('/')[1]}` : defaultPath;
  const currentPath =
    !isSidechainConfigured && currentPathRaw === '/he-payout' ? '/trending' : currentPathRaw;
  const onValueChange = (next: string) => {
    if (next === '/he-payout' && isSidechainConfigured) {
      router.push(hePayoutPath, undefined);
      return;
    }

    if (param) {
      router.push(`${next}/${param}`, undefined);
    } else {
      router.push(next, undefined);
    }
  };
  return (
    <Select value={currentPath} onValueChange={onValueChange}>
      <SelectTrigger className="bg-background" data-testid="posts-filter">
        <SelectValue placeholder={t('select_sort.posts_sort.trending')} />
      </SelectTrigger>
      <SelectContent data-testid="posts-filter-list">
        <SelectGroup>
          {isSidechainConfigured ? <SelectItem value="/he-payout">Community</SelectItem> : null}
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
