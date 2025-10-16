import { dateToShow } from '@ui/lib/parse-date';
import BasePathLink from './base-path-link';
import { useAccountQuery } from './hooks/use-account';
import { useFollowsQuery } from './hooks/use-follows';
import { convertToHP, numberWithCommas } from '@ui/lib/utils';
import Big from 'big.js';
import { useDynamicGlobalData } from './hooks/use-dynamic-global-data';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useFollowingInfiniteQuery } from '../features/account-lists/hooks/use-following-infinitequery';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import ButtonsContainer from './buttons-container';
import { convertStringToBig } from '@ui/lib/helpers';
import TimeAgo from '@hive/ui/components/time-ago';
import { compareDates } from '../lib/utils';
import { getDefaultImageUrl } from '@hive/ui';

export function PopoverCardData({ author, blacklist }: { author: string; blacklist: string[] }) {
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const follows = useFollowsQuery(author);
  const { data: account, isLoading } = useAccountQuery(author);
  const following = useFollowingInfiniteQuery(user.username || '', 1000, 'blog', ['blog']);
  const mute = useFollowingInfiniteQuery(user.username, 1000, 'ignore', ['ignore']);
  const about =
    account && account.posting_json_metadata
      ? JSON.parse(account.posting_json_metadata)?.profile?.about
      : null;
  const { data: dynamicData } = useDynamicGlobalData();
  const delegated_hive =
    dynamicData && account
      ? convertToHP(
          convertStringToBig(account.delegated_vesting_shares).minus(
            convertStringToBig(account.received_vesting_shares)
          ),
          dynamicData.total_vesting_shares,
          dynamicData.total_vesting_fund_hive
        )
      : Big(0);
  const vesting_hive =
    dynamicData && account
      ? convertToHP(
          convertStringToBig(account.vesting_shares),
          dynamicData.total_vesting_shares,
          dynamicData.total_vesting_fund_hive
        )
      : Big(0);
  const hp = vesting_hive.minus(delegated_hive);
  const legalBlockedUser = userIllegalContent.some((e) => e === account?.name);

  return (
    <div className="space-y-2">
      {account && !isLoading && follows.data && !follows.isLoading ? (
        <>
          <div className="flex">
            <BasePathLink href={`/@${author}`} data-testid="popover-card-user-avatar">
              <Avatar className="flex h-[75px] w-[75px] items-center justify-center overflow-hidden rounded-full">
                <AvatarImage
                  className="h-full w-full object-cover"
                  src={getDefaultImageUrl()}
                  alt="Profile picture"
                />
                <AvatarFallback>
                  <img
                    className="h-full w-full object-cover"
                    src="https://images.hive.blog/DQmb2HNSGKN3pakguJ4ChCRjgkVuDN9WniFRPmrxoJ4sjR4"
                    alt="default img"
                  />
                </AvatarFallback>
              </Avatar>
            </BasePathLink>
            <div translate="no">
              <BasePathLink
                href={`/@${author}`}
                className="block font-bold hover:cursor-pointer"
                data-testid="popover-card-user-name"
              >
                {account.posting_json_metadata
                  ? JSON.parse(account.posting_json_metadata)?.profile?.name
                  : null}
              </BasePathLink>
              <BasePathLink
                href={`/@${author}`}
                className="flex px-2 text-sm text-gray-500 hover:cursor-pointer"
                data-testid="popover-card-user-nickname"
              >
                <span className="block">{`@${author}`}</span>
              </BasePathLink>
              <div className="grid grid-cols-2 gap-2 p-2">
                {legalBlockedUser ? (
                  <div className="px-2 py-6">{t('global.unavailable_for_legal_reasons')}</div>
                ) : user.username === author ? null : (
                  <>
                    <ButtonsContainer
                      username={author}
                      user={user}
                      variant="default"
                      follow={following}
                      mute={mute}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          {!legalBlockedUser ? (
            <>
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
                {t('post_content.header.hover_author.joined')} {dateToShow(account.created, t)}
                <span className="mx-1 flex flex-col">
                  •{t('user_profile.active')}
                  <TimeAgo
                    date={compareDates([account.created, account.last_vote_time, account.last_post])}
                  />
                </span>
              </div>
            </>
          ) : null}
        </>
      ) : null}
      {blacklist.length > 0 ? (
        <div>
          <div>Blacklists</div>
          <div className="text-sm">❗️{blacklist[0]}</div>
        </div>
      ) : null}
    </div>
  );
}
