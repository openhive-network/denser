'use client';

import { dateToShow } from '@ui/lib/parse-date';
import { convertToHP, numberWithCommas } from '@ui/lib/utils';
import Big from 'big.js';
import { Avatar, AvatarFallback, AvatarImage, getUserAvatarUrl } from '@ui/components';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import { convertStringToBig } from '@ui/lib/helpers';
import TimeAgo from '@hive/ui/components/time-ago';
import { compareDates } from '@/blog/lib/utils';
import BasePathLink from '@/blog/components/base-path-link';
import { useAccountQuery } from '@/blog/components/hooks/use-account';
import { useDynamicGlobalData } from '@/blog/components/hooks/use-dynamic-global-data';
import { useFollowsQuery } from '@/blog/components/hooks/use-follows';
import { useFollowingInfiniteQuery } from '../account-lists/hooks/use-following-infinitequery';
import ButtonsContainer from '../mute-follow/buttons-container';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { AlertTriangle } from 'lucide-react';
import { accountReputation } from '@hive/ui';

interface PopoverCardDataProps {
  author: string;
  blacklist: string[];
  authorReputation: number;
}

const PopoverCardData = ({ author, blacklist, authorReputation }: PopoverCardDataProps) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const follows = useFollowsQuery(author);
  const { data: account, isLoading } = useAccountQuery(author);
  const following = useFollowingInfiniteQuery(user.username || '', 1000, 'blog', ['blog']);
  const mute = useFollowingInfiniteQuery(user.username, 1000, 'ignore', ['ignore']);
  const about = account?.profile?.about ?? null;
  const { data: dynamicData } = useDynamicGlobalData();
  const hiveChain = hiveChainService.reuseHiveChain();
  const delegated_hive =
    dynamicData && account && hiveChain
      ? convertToHP(
          convertStringToBig(account.delegated_vesting_shares).minus(
            convertStringToBig(account.received_vesting_shares)
          ),
          hiveChain,
          dynamicData.total_vesting_shares,
          dynamicData.total_vesting_fund_hive
        )
      : Big(0);
  const vesting_hive =
    dynamicData && account && hiveChain
      ? convertToHP(
          convertStringToBig(account.vesting_shares),
          hiveChain,
          dynamicData.total_vesting_shares,
          dynamicData.total_vesting_fund_hive
        )
      : Big(0);
  const hp = vesting_hive.minus(delegated_hive);
  const legalBlockedUser = userIllegalContent.some((e) => e === account?.name);

  return (
    <div>
      {account && !isLoading && follows.data && !follows.isLoading ? (
        <>
          {/* Header with avatar and name */}
          <div className="flex items-start gap-3 border-b border-border p-4">
            <BasePathLink href={`/@${author}`} data-testid="popover-card-user-avatar">
              <Avatar className="h-14 w-14 ring-2 ring-border">
                <AvatarImage
                  className="h-full w-full object-cover"
                  src={getUserAvatarUrl(author, 'medium')}
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
            <div className="flex-1" translate="no">
              <BasePathLink
                href={`/@${author}`}
                className="block text-base font-semibold text-foreground hover:text-destructive"
                data-testid="popover-card-user-name"
              >
                {account.profile?.name || author}
              </BasePathLink>
              <div className="flex items-center gap-1">
                <BasePathLink
                  href={`/@${author}`}
                  className="text-sm text-muted-foreground hover:text-destructive"
                  data-testid="popover-card-user-nickname"
                >
                  @{author}
                </BasePathLink>
                <span className="text-sm text-muted-foreground" data-testid="popover-card-user-reputation">
                  ({accountReputation(authorReputation)})
                </span>
              </div>
              {!legalBlockedUser && user.username !== author && (
                <div className="mt-2 flex gap-2">
                  <ButtonsContainer
                    username={author}
                    user={user}
                    variant="default"
                    follow={following}
                    mute={mute}
                  />
                </div>
              )}
              {legalBlockedUser && (
                <p className="mt-2 text-sm text-muted-foreground">{t('global.unavailable_for_legal_reasons')}</p>
              )}
            </div>
          </div>

          {!legalBlockedUser && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 border-b border-border p-3" translate="no">
                <div className="flex flex-col items-center" data-testid="user-followers">
                  <span className="text-lg font-semibold text-foreground">{follows.data.follower_count}</span>
                  <span className="text-xs text-muted-foreground">{t('post_content.header.hover_author.followers')}</span>
                </div>
                <div className="flex flex-col items-center" data-testid="user-following">
                  <span className="text-lg font-semibold text-foreground">{follows.data.following_count}</span>
                  <span className="text-xs text-muted-foreground">{t('post_content.header.hover_author.following')}</span>
                </div>
                <div className="flex flex-col items-center" data-testid="user-hp">
                  <span className="text-lg font-semibold text-foreground">{numberWithCommas(hp.toFixed(0))}</span>
                  <span className="text-xs text-muted-foreground">HP</span>
                </div>
              </div>

              {/* About */}
              {about && (
                <p data-testid="user-about" className="border-b border-border p-3 text-sm text-muted-foreground" translate="no">
                  {about.slice(0, 140)}{140 < about.length ? '...' : ''}
                </p>
              )}

              {/* Footer with dates */}
              <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
                <span>{t('post_content.header.hover_author.joined')} {dateToShow(account.created, t)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {t('user_profile.active')}
                  <TimeAgo date={compareDates([account.created, account.last_vote_time, account.last_post])} />
                </span>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}

      {blacklist.length > 0 && (
        <div className="border-t border-destructive/20 bg-destructive/5 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="mr-1 h-4 w-4" />
            <span>{t('post_content.blacklisted')}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{blacklist[0]}</p>
        </div>
      )}
    </div>
  );
};

export default PopoverCardData;
