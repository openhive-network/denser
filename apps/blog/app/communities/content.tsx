'use client';

import { useState, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@ui/components/input';
import { Icons } from '@ui/components/icons';
import { Separator } from '@ui/components/separator';
import CommunitiesSelectFilter from '@/blog/features/communities-list/communities-select-filter';
import CommunitiesList from '@/blog/features/communities-list/communities-list';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Link } from '@hive/ui';
import env from '@beam-australia/react-env';
import { getCommunities } from '@transaction/lib/bridge-api';
import { useTranslation } from '@/blog/i18n/client';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';

const CommunitiesContent = () => {
  const walletHost = env('WALLET_ENDPOINT');
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const [sort, setSort] = useState('rank');
  const [inputQuery, setInputQuery] = useState<string>('');
  const [query, setQuery] = useState<string | null>();
  const observer = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const { data: communitiesData } = useQuery({
    queryKey: ['communitiesList', sort, query],
    queryFn: async () => await getCommunities(sort, query, observer)
  });

  function handleSearchCommunity(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      inputQuery !== '' ? setQuery(inputQuery) : setQuery(null);
    }
  }

  function handleChangeFilter(e: string) {
    setSort(e);
  }

  return (
    <>
      <div className="mt-4 flex items-center justify-between" data-testid="communities-header-title">
        <span className="text-sm font-medium sm:text-xl" data-testid="communities-header">
          {t('communities.communities')}
        </span>
        {user.isLoggedIn ? (
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
    </>
  );
};
export default CommunitiesContent;
