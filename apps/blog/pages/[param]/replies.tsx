import ProfileLayout from '@/blog/components/common/profile-layout';
import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import { getAccountPosts, DATA_LIMIT as PER_PAGE } from '@transaction/lib/bridge';
import { useInfiniteQuery } from '@tanstack/react-query';
import RepliesList from '@/blog/components/replies-list';
import { FC, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getAccountMetadata, getTranslations, MetadataProps } from '@/blog/lib/get-translations';
import Head from 'next/head';
import PostCardSkeleton from '@ui/components/card-skeleton';
import { commonVariables } from '@ui/lib/common-variables';

const UserReplies: FC<{ metadata: MetadataProps }> = ({ metadata }) => {
  const { t } = useTranslation('common_blog');
  const { username } = useSiteParams();
  const { ref, inView } = useInView();
  const { user } = useUser();
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery(
    ['accountReplies', username, 'replies'],
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getAccountPosts(
        'replies',
        username,
        user.username !== '' ? user.username : commonVariables.defaultObserver,
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

      enabled: !!username
    }
  );

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  return (
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <ProfileLayout>
        {!isLoading && data ? (
          <div className="flex flex-col">
            {data.pages.map((page, index) => {
              return page && page.length > 0 ? (
                <RepliesList data={page} key={`replies-${index}`} />
              ) : (
                <div
                  key="empty"
                  className="border-card-empty-border mt-12 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
                  data-testid="user-has-not-had-any-replies-yet"
                >
                  {t('user_profile.no_replies_yet', { username: username })}
                </div>
              );
            })}
            <div>
              <button ref={ref} onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
                {isFetchingNextPage ? (
                  <PostCardSkeleton />
                ) : hasNextPage ? (
                  t('user_profile.load_newer')
                ) : data.pages[0] && data.pages[0].length > 0 ? (
                  t('user_profile.nothing_more_to_load')
                ) : null}
              </button>
            </div>
          </div>
        ) : null}
      </ProfileLayout>
    </>
  );
};

export default UserReplies;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      metadata: await getAccountMetadata((ctx.params?.param as string) ?? '', 'Replies to'),
      ...(await getTranslations(ctx))
    }
  };
};
