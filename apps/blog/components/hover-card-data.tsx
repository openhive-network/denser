import { dateToShow, dateToFullRelative } from '@ui/lib/parse-date';
import UserAvatar from '@/blog/components/user-avatar';
import Link from 'next/link';
import { useAccountQuery } from './hooks/use-accout';
import { useFollowsQuery } from './hooks/use-follows';
import { delegatedHive, numberWithCommas, vestingHive } from '@ui/lib/utils';
import Big from 'big.js';
import { useDynamicGlobalData } from './hooks/use-dynamic-global-data';
import { useTranslation } from 'next-i18next';
import FollowButton from './follow-button';
import { useUser } from '@smart-signer/lib/auth/use-user';

export function HoverCardData({ author }: { author: string }) {
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const follows = useFollowsQuery(author);
  const account = useAccountQuery(author);
  const about =
    account.data && account.data.posting_json_metadata
      ? JSON.parse(account.data.posting_json_metadata)?.profile?.about
      : null;
  const dynamicData = useDynamicGlobalData();
  const delegated_hive =
    dynamicData.data && account.data ? delegatedHive(account.data, dynamicData.data) : Big(0);
  const vesting_hive =
    dynamicData.data && account.data ? vestingHive(account.data, dynamicData.data) : Big(0);
  const hp = vesting_hive.minus(delegated_hive);

  return (
    <div className="space-y-2">
      {account.data && !account.isLoading && follows.data && !follows.isLoading ? (
        <>
          <div className="flex">
            <Link href={`/@${author}`} data-testid="hover-card-user-avatar">
              <UserAvatar username={author} size="large" className="h-[75px] w-[75px]" />
            </Link>
            <div translate="no">
              <Link
                href={`/@${author}`}
                className="block font-bold hover:cursor-pointer"
                data-testid="hover-card-user-name"
              >
                {account.data.posting_json_metadata
                  ? JSON.parse(account.data.posting_json_metadata)?.profile?.name
                  : null}
              </Link>
              <Link
                href={`/@${author}`}
                className="flex text-sm text-gray-500 hover:cursor-pointer"
                data-testid="hover-card-user-nickname"
              >
                <span className="block">{`@${author}`}</span>
              </Link>
              <div className="grid grid-cols-2 gap-2 py-2">
                <FollowButton user={user} username={author} variant="secondary" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2" translate="no">
            <div className="flex flex-col items-center" data-testid="user-followers">
              {follows.data.follower_count}
              <span className="text-xs">{t('post_content.header.hover_author.followers')}</span>
            </div>
            <div className="flex flex-col items-center" data-testid="user-following">
              {follows.data.following_count}
              <span className="text-xs">{t('post_content.header.hover_author.following')}</span>
            </div>
            <div className="flex flex-col items-center" data-testid="user-hp">
              {numberWithCommas(hp.toFixed(0))}
              <span className="text-xs">HP</span>
            </div>
          </div>
          <p data-testid="user-about" className="text-sm text-gray-500" translate="no">
            {about ? about.slice(0, 157) + (157 < about.length ? '...' : '') : null}
          </p>
          <div className="flex justify-center text-xs">
            {t('post_content.header.hover_author.joined')} {dateToShow(account.data.created, t)}
            <span className="mx-1">•</span>
            {t('user_profil.active') + ' ' + dateToFullRelative(account.data.last_vote_time, t)}
          </div>
        </>
      ) : null}
    </div>
  );
}
