import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getDefaultProps } from '../lib/get-translations';
import Head from 'next/head';
import { ModeSwitchInput } from '@ui/components/mode-switch-input';
import { useEffect } from 'react';
import AIResult from '../features/search/ai-result';
import { SearchSort } from '@ui/hooks/use-search';
import AccountTopicResult from '../features/search/account-topic-result';
import { useQuery } from '@tanstack/react-query';
import { getHiveSenseStatus } from '../lib/get-data';
import { useLocalStorage } from 'usehooks-ts';
import { DEFAULT_PREFERENCES, Preferences } from '@/blog/lib/utils';
import { useUser } from '@smart-signer/lib/auth/use-user';

export const getServerSideProps: GetServerSideProps = getDefaultProps;
const TAB_TITLE = 'Search - Hive';
export default function SearchPage() {
  const { data: hiveSense } = useQuery(['hivesense-api'], () => getHiveSenseStatus(), {
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
  const { user } = useUser();
  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  const router = useRouter();
  const aiQuery = router.query.ai as string | undefined;
  const classicQuery = router.query.q as string | undefined;
  const topicQuery = router.query.p as string | undefined;
  const userTopicQuery = router.query.a as string | undefined;
  const sortQuery = router.query.s as SearchSort | undefined;
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

  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>
      <div className="m-auto flex max-w-4xl flex-col gap-12 px-4 py-8">
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <ModeSwitchInput searchPage aiAvailable={!!hiveSense} />
          </div>
        </div>
        {!!aiQuery ? <AIResult query={aiQuery} nsfwPreferences={preferences.nsfw} /> : null}
        {!!classicQuery && !!sortQuery ? (
          <AccountTopicResult nsfwPreferences={preferences.nsfw} query={classicQuery} sort={sortQuery} />
        ) : null}
        {!!userTopicQuery && !!topicQuery && !!sortQuery ? (
          <AccountTopicResult
            author={userTopicQuery}
            query={userTopicQuery}
            sort={sortQuery}
            nsfwPreferences={preferences.nsfw}
          />
        ) : null}
      </div>
    </>
  );
}
