'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { IFollow } from '@hive/common-hiveio-packages/wax';
import { getLiteFollowers, getLiteFollowing } from '@transaction/lib/lite-social-api';
import { Button } from '@ui/components/button';
import Loading from '@ui/components/loading';
import NoDataError from '@/blog/components/no-data-error';
import { useTranslation } from '@/blog/i18n/client';
import AccountNameLink from './account-name-link';

const PAGE_SIZE = 50;

export type LiteFollowListKind = 'followers' | 'following' | 'muted';

const TITLE_KEYS: Record<LiteFollowListKind, string> = {
  followers: 'user_profile.lists.followers_label',
  following: 'user_profile.lists.following_label',
  muted: 'user_profile.lists.muted_users'
};

/** The page of `list` after `start`, and the account each row is about (the other side of the follow). */
async function readPage(account: string, list: LiteFollowListKind, start: string | null): Promise<IFollow[]> {
  const query = { account, start, type: list === 'muted' ? 'ignore' : 'blog', limit: PAGE_SIZE };
  const rows = list === 'followers' ? await getLiteFollowers(query) : await getLiteFollowing(query);
  return rows ?? [];
}

const rowAccount = (row: IFollow, list: LiteFollowListKind) => (list === 'followers' ? row.follower : row.following);

/**
 * The followers, follows or mutes of a lite account (`account` is its DID), read through the node's
 * `lite.get_followers` / `lite.get_following`; lite accounts in it show by name with the badge.
 */
export default function LiteFollowList({ account, list }: { account: string; list: LiteFollowListKind }) {
  const { t } = useTranslation('common_blog');
  const query = useInfiniteQuery({
    queryKey: ['liteFollowList', account, list],
    queryFn: ({ pageParam }: { pageParam: string | null }) => readPage(account, list, pageParam),
    initialPageParam: null,
    getNextPageParam: (page: IFollow[]) => (page.length === PAGE_SIZE ? rowAccount(page[page.length - 1], list) : undefined)
  });

  if (query.isError) return <NoDataError />;
  if (query.isPending) return <Loading loading />;
  const rows = query.data.pages.flat();

  return (
    <div className="flex flex-col gap-2 p-2" data-testid={`lite-follow-list-${list}`}>
      <h1 className="self-center p-2">{t(TITLE_KEYS[list])}</h1>
      {rows.length === 0 ? (
        <p className="self-center text-sm text-muted-foreground">{t('user_profile.lists.list.empty_list')}</p>
      ) : (
        <ul>
          {rows.map((row) => {
            const other = rowAccount(row, list);
            return (
              <li key={other} className="flex items-center bg-background-tertiary px-3 py-1 font-semibold text-destructive odd:bg-background">
                <AccountNameLink account={other} />
              </li>
            );
          })}
        </ul>
      )}
      {query.hasNextPage ? (
        <Button variant="outlineRed" className="self-center" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t('user_profile.load_newer')}
        </Button>
      ) : null}
    </div>
  );
}
