import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@hive/ui';
import { Icons } from '@ui/components/icons';
import { useRouter } from 'next/router';
import { useState, KeyboardEvent, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import { getDefaultProps } from '../lib/get-translations';
import { getSearch } from '@transaction/lib/bridge';
import SearchCard from '../components/search-card';
import { useLocalStorage } from 'usehooks-ts';
import { DEFAULT_PREFERENCES, Preferences } from '../pages/[param]/settings';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useFollowListQuery } from '../components/hooks/use-follow-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import Loading from '@ui/components/loading';
import { PostSkeleton } from './[...param]';
import { useInView } from 'react-intersection-observer';

export const getServerSideProps: GetServerSideProps = getDefaultProps;

const PER_PAGE = 20;

export default function SearchPage() {
  const router = useRouter();
  const { t } = useTranslation('common_blog');
  const { ref, inView } = useInView();
  const [values, setValues] = useState({
    sort: 'newest',
    input: '',
    scrollid: ''
  });
  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      router.push(`/search?q=${encodeURIComponent(values.input)}&sort=${encodeURIComponent(values.sort)}`);
    }
  };
  const { user } = useUser();
  const {
    data: entriesData,
    isLoading: entriesDataIsLoading,
    isFetching: entriesDataIsFetching,
    isError: entriesDataIsError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useInfiniteQuery(
    ['entriesInfinite', values.sort, values.input],
    async () => {
      return await getSearch(router.query.q as string, values.scrollid, router.query.sort as string, '');
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.results.length === PER_PAGE) {
          setValues({ ...values, scrollid: lastPage.scroll_id });
          return {
            scroll_id: lastPage.scroll_id
          };
        }
      },
      enabled: Boolean(router.query.sort) && Boolean(router.query.q)
    }
  );
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView]);
  const handleSelect = (e: string) => {
    setValues({ ...values, sort: e });
    router.push(`/search?q=${encodeURIComponent(values.input)}&s=${encodeURIComponent(e)}`);
  };
  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  const { data: blacklist } = useFollowListQuery(user.username, 'blacklisted');

  return (
    <div className="flex flex-col gap-12 px-4 py-8">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icons.search className="h-5 w-5 rotate-90" />
          </div>
          <Input
            type="search"
            className="block rounded-full p-4 pl-10 text-sm "
            placeholder="Search..."
            value={values.input}
            onChange={(e) => setValues({ ...values, input: e.target.value })}
            onKeyDown={(e) => handleEnter(e)}
          />
        </div>
        <div>
          <Select defaultValue="newest" value={values.sort} onValueChange={handleSelect}>
            <Label>Sort by:</Label>
            <SelectTrigger className="w-[180px]" data-testid="search-sort-by-dropdown-list">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="newest">{t('select_sort.search_sorter.newest')}</SelectItem>
                <SelectItem value="popularity">{t('select_sort.search_sorter.popularity')}</SelectItem>
                <SelectItem value="relevance">{t('select_sort.search_sorter.relevance')}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {entriesDataIsError ? null : entriesDataIsLoading ? (
        <Loading loading={entriesDataIsLoading && entriesDataIsFetching} />
      ) : !entriesData ? (
        'Nothing was found.'
      ) : (
        entriesData.pages.map((data) => (
          <ul>
            {data.results.map((post) => (
              <SearchCard post={post} key={post.id} nsfw={preferences.nsfw} blacklist={blacklist} />
            ))}
          </ul>
        ))
      )}
      <div>
        <button ref={ref} onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
          {isFetchingNextPage ? (
            <PostSkeleton />
          ) : hasNextPage ? (
            t('user_profile.load_newer')
          ) : (
            t('user_profile.nothing_more_to_load')
          )}
        </button>
      </div>
    </div>
  );
}
