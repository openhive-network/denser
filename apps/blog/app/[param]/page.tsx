'use client';

import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useInfiniteQuery } from '@tanstack/react-query';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import { useParams } from 'next/navigation';
import { DATA_LIMIT as PER_PAGE, Entry, getAccountPosts } from '@transaction/lib/bridge';
import PostList from '@/blog/components/post-list';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from '@/blog/i18n/client';
import { useEffect } from 'react';
import PostSkeleton from '@/blog/components/postSkeleton';

const Page = () => {
  const { user } = useUserClient();
  const { t } = useTranslation('user_profile');
  const { param: username } = useParams() as {
    param: string;
  };
  const clean_username = username.replace('%40', '');

  const { ref: refAcc, inView: inViewAcc } = useInView();
  const {
    data: accountEntriesData,
    isLoading: accountEntriesIsLoading,
    isFetching: accountEntriesIsFetching,
    isFetchingNextPage: accountIsFetchingNextPage,
    fetchNextPage: accountFetchNextPage,
    hasNextPage: accountHasNextPage
  } = useInfiniteQuery(
    ['accountEntriesInfinite', clean_username],
    async ({ pageParam }: { pageParam?: Entry }) => {
      return await getAccountPosts(
        'blog',
        clean_username,
        user.username,
        pageParam?.author,
        pageParam?.permlink
      );
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.length === PER_PAGE) {
          return {
            author: lastPage[lastPage.length - 1].author,
            permlink: lastPage[lastPage.length - 1].permlink
          };
        }
      },
      enabled: Boolean(clean_username)
    }
  );
  useEffect(() => {
    if (inViewAcc && accountHasNextPage) {
      accountFetchNextPage();
    }
  }, [accountFetchNextPage, accountHasNextPage, inViewAcc]);

  const legalBlockedUser = userIllegalContent.includes(clean_username);

  return !legalBlockedUser ? (
    <>
      {!accountEntriesIsLoading && accountEntriesData ? (
        <>
          {accountEntriesData.pages[0]?.length !== 0 ? (
            accountEntriesData.pages.map((page, index) =>
              page ? <PostList data={page} key={`x-${index}`} /> : null
            )
          ) : (
            <div
              className="border-card-empty-border mt-12 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
              data-testid="user-has-not-started-blogging-yet"
            >
              {t('user_profile.no_blogging_yet', { username: clean_username })}
            </div>
          )}
          <div>
            <button
              ref={refAcc}
              onClick={() => accountFetchNextPage()}
              disabled={!accountHasNextPage || accountIsFetchingNextPage}
            >
              {accountIsFetchingNextPage ? (
                <PostSkeleton />
              ) : accountHasNextPage ? (
                t('user_profile.load_newer')
              ) : accountEntriesData.pages[0] && accountEntriesData.pages[0].length > 0 ? (
                t('user_profile.nothing_more_to_load')
              ) : null}
            </button>
          </div>
          <div>
            {accountEntriesIsFetching && !accountIsFetchingNextPage ? 'Background Updating...' : null}
          </div>
        </>
      ) : null}
    </>
  ) : (
    <div className="p-10">{t('global.unavailable_for_legal_reasons')}</div>
  );
};

export default Page;
