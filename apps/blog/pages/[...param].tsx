import {
  getCommunity,
  getSubscribers,
  getPostsRanked,
  getAccountNotifications,
  getAccountPosts,
  getPost
} from '@transaction/lib/bridge';
import { FC, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import {
  getAccountMetadata,
  getCommunityMetadata,
  getTranslations,
  MetadataProps
} from '../lib/get-translations';
import { dehydrate, QueryClient } from '@tanstack/react-query';
import NoDataError from '../components/no-data-error';
import { getLogger } from '@ui/lib/logging';
import MainPage from '../components/main-page';
import AccountProfileMainPage from '../feature/account-profile/main-page';
import { Skeleton } from '@ui/components/skeleton';
import { DEFAULT_OBSERVER } from '../lib/utils';
import {
  getAccount,
  getAccountFull,
  getAccountReputations,
  getDynamicGlobalProperties
} from '@transaction/lib/hive';
import { useLocalStorage } from 'usehooks-ts';
import { DEFAULT_PREFERENCES, Preferences } from '@/blog/lib/utils';
import { useUser } from '@smart-signer/lib/auth/use-user';
import PostRedirectPage from '../components/post-redirect-page';

const logger = getLogger('app');
export type PageType = 'main' | 'community' | 'userProfile' | 'redirect' | 'tag';
const sorts = ['trending', 'hot', 'created', 'payout', 'muted'];
function replaceUndefinedWithNull(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => (v === undefined ? null : replaceUndefinedWithNull(v)));
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, v === undefined ? null : replaceUndefinedWithNull(v)])
    );
  }
  return obj;
}

const getPageType = (firstParam: string, secondParam?: string) => {
  // /(trending || hot || created || payout || muted) => main page
  if (sorts.includes(firstParam) && !secondParam) return 'main';
  // /(trending || hot || created || payout || muted)/hive-number => community page
  if (sorts.includes(firstParam) && secondParam?.startsWith('hive-')) return 'community';
  // /(trending || hot || created || payout || muted)/tag => community page
  if (sorts.includes(firstParam) && !secondParam?.startsWith('hive-')) return 'tag';
  // /@username => user profile page
  if (firstParam.startsWith('@') && !secondParam) return 'userProfile';
  // /@username/permlink => redirect page to post
  if (!!firstParam && !!secondParam) return 'redirect';
};

const ParamPage: FC<{ metadata: MetadataProps; pageType: PageType; redirectUrl: string }> = ({
  metadata,
  pageType,
  redirectUrl
}) => {
  const router = useRouter();
  const { user } = useUser();
  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  useEffect(() => {
    // Save scroll position when leaving the page
    const handleRouteChange = () => {
      sessionStorage.setItem('scrollPosition', window.scrollY.toString());
    };

    // Restore scroll position when returning to the page
    const restoreScrollPosition = () => {
      const scrollPosition = sessionStorage.getItem('scrollPosition');
      if (scrollPosition) {
        window.scrollTo(0, parseInt(scrollPosition));
        handleRouteChange();
      }
    };
    router.events.on('routeChangeStart', handleRouteChange);
    // Restore scroll position after the page content is loaded
    if (typeof window !== 'undefined') {
      // Wait for content to be rendered
      setTimeout(restoreScrollPosition, 500);
    }

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  switch (pageType) {
    case 'main':
    case 'community':
    case 'tag':
      return <MainPage metadata={metadata} pageType={pageType} nsfwPreferences={preferences.nsfw} />;
    case 'userProfile':
      return <AccountProfileMainPage metadata={metadata} nsfwPreferences={preferences.nsfw} />;
    case 'redirect':
      return <PostRedirectPage url={redirectUrl} />;
    default:
      return <NoDataError />;
  }
};

export default ParamPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const allParams: string[] = Array.isArray(ctx.params?.param) ? (ctx.params!.param as string[]) : [];
  const [firstParam, secondParam] = allParams;
  const pageType = getPageType(firstParam, secondParam);
  const tag = (secondParam || '').toLocaleLowerCase();
  const queryClient = new QueryClient();
  let redirectUrl = '';
  let metadata = {
    tabTitle: '',
    description: '',
    image: 'https://hive.blog/images/hive-blog-share.png',
    title: firstParam
  };
  const username = firstParam.split('@')[1];

  switch (pageType) {
    case 'community':
      metadata = await getCommunityMetadata(firstParam, tag, 'Posts');
      try {
        await queryClient.prefetchQuery(['community', tag, ''], async () => await getCommunity(tag, ''));
        await queryClient.prefetchQuery(['subscribers', tag], async () => await getSubscribers(tag));
        await queryClient.prefetchQuery(
          ['AccountNotification', tag],
          async () => await getAccountNotifications(tag)
        );
      } catch (error) {
        logger.error('Error prefetching community metadata:', error);
      }
    case 'main':
    case 'tag':
      try {
        await queryClient.prefetchInfiniteQuery(
          ['entriesInfinite', firstParam, tag],
          async ({ pageParam }) => {
            const postsData = await getPostsRanked(
              firstParam,
              tag,
              pageParam?.author,
              pageParam?.permlink,
              DEFAULT_OBSERVER
            );
            if (!!postsData && postsData.length > 0) {
              const cleanedPostsList = postsData.map((post) => ({ ...post, active_votes: [] }));
              return cleanedPostsList;
            }
            return postsData;
          }
        );
      } catch (error) {
        logger.error('Error prefetching entriesInfinite:', error);
      }

      break;
    case 'userProfile':
      metadata = await getAccountMetadata(firstParam, 'Posts');
      try {
        await queryClient.prefetchQuery(['profileData', username], () => getAccountFull(username));
        await queryClient.prefetchQuery(['accountData', username], () => getAccount(username));
        await queryClient.prefetchQuery(['dynamicGlobalData'], () => getDynamicGlobalProperties());
        await queryClient.prefetchQuery(['accountReputationData', username], () =>
          getAccountReputations(username, 1)
        );
        await queryClient.prefetchInfiniteQuery(
          ['accountEntriesInfinite', username],
          async ({ pageParam }) => {
            const data = await getAccountPosts(
              'blog',
              username,
              DEFAULT_OBSERVER,
              pageParam?.author,
              pageParam?.permlink
            );
            if (data) {
              const nsfwCleanedData = data?.filter(
                (post) => !(!!post.json_metadata.tags && post.json_metadata?.tags.includes('nsfw'))
              );
              return nsfwCleanedData;
            }
            return data;
          }
        );
      } catch (error) {
        logger.error('Error prefetching account entries:', error);
      }
      break;
    case 'redirect':
      const permlink = secondParam;
      try {
        const post = await queryClient.fetchQuery(['postData', username, permlink], () =>
          getPost(username, permlink)
        );
        if (post) {
          console.log('Found post for redirect:', post);
          redirectUrl = `/${post.category ?? post.community}/@${username}/${permlink}`;
          return {
            redirect: {
              destination: redirectUrl,
              permanent: true
            }
          };
        }
      } catch (error) {
        logger.error('Error prefetching post data:', `/${username}/${permlink}`, error);
      }
      break;
  }

  return {
    props: {
      dehydratedState: replaceUndefinedWithNull(dehydrate(queryClient)),
      redirectUrl,
      metadata,
      pageType,
      ...(await getTranslations(ctx))
    }
  };
};
