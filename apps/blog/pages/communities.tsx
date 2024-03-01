import CommunitiesSidebar from '@/blog/components/communities-sidebar';
import { Input } from '@ui/components/input';
import { useState, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCommunities, getSubscriptions } from '@transaction/lib/bridge';
import CommunitiesSelectFilter from '@/blog/components/communities-select-filter';
import CommunitiesList from '@/blog/components/communities-list';
import Loading from '@ui/components/loading';
import ExploreHive from '@/blog/components/explore-hive';
import { Icons } from '@ui/components/icons';
import { Separator } from '@ui/components';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import CommunitiesMybar from '../components/communities-mybar';
import Link from 'next/link';
import env from '@beam-australia/react-env';

export default function CommunitiesPage() {
  const walletHost = env('WALLET_ENDPOINT');
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const [sort, setSort] = useState('rank');
  const [inputQuery, setInputQuery] = useState<string>('');
  const [query, setQuery] = useState<string | null>();
  const {
    isLoading: communitiesDataIsLoading,
    error: communitiesDataError,
    data: communitiesData
  } = useQuery(
    ['communitiesList', sort, query, user?.username],
    async () => await getCommunities(sort, query, user?.username || '')
  );
  const {
    data: mySubsData,
    isLoading: mySubsIsLoading,
    isError: mySubsIsError
  } = useQuery([['subscriptions', user?.username]], () => getSubscriptions(user?.username || ''), {
    enabled: Boolean(user?.username)
  });
  function handleSearchCommunity(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      inputQuery !== '' ? setQuery(inputQuery) : setQuery(null);
    }
  }

  function handleChangeFilter(e: string) {
    setSort(e);
  }

  if (communitiesDataIsLoading) return <Loading loading={communitiesDataIsLoading} />;
  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2 pt-8">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-4 md:flex xl:col-span-2">
          {user?.isLoggedIn ? (
            <CommunitiesMybar data={mySubsData} username={user ? user?.username : ''} />
          ) : (
            <CommunitiesSidebar />
          )}{' '}
        </div>
        <div className="col-span-12 md:col-span-8">
          <div className="mt-4 flex items-center justify-between" data-testid="communities-header-title">
            <span className="text-sm font-medium sm:text-xl" data-testid="communities-header">
              {t('communities.communities')}
            </span>
            {user?.isLoggedIn ? (
              <Link
                className="text-sm font-medium text-red-600 dark:hover:text-red-800"
                href={`${walletHost}/@${user.username}/communities`}
              >
                Create a Community
              </Link>
            ) : null}
          </div>
          <div className="mt-4 flex w-full items-center justify-between gap-4" translate="no">
            <div className="relative w-full max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icons.search className="h-5 w-5 rotate-90" />
              </div>
              <Input
                type="search"
                id="search"
                value={inputQuery}
                placeholder={t('communities.search')}
                autoComplete="off"
                className="block rounded-full bg-white p-4 pl-10 text-sm dark:bg-background/95 dark:text-white"
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => handleSearchCommunity(e)}
              />
            </div>
            <CommunitiesSelectFilter filter={sort} handleChangeFilter={handleChangeFilter} />
          </div>
          <Separator className="my-4" />
          {communitiesData && communitiesData?.length > 0 ? (
            <CommunitiesList data={communitiesData} />
          ) : (
            <div className="w-full py-4" data-testid="communities-search-no-results-msg">
              {t('communities.no_results')}
            </div>
          )}
        </div>
        <div className="hidden lg:flex xl:col-span-2">
          {user?.isLoggedIn ? <CommunitiesSidebar /> : <ExploreHive />}{' '}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, [
        'common_blog',
        'smart-signer'
      ]))
    }
  };
};
