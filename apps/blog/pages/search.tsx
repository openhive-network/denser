import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getDefaultProps } from '../lib/get-translations';
import { useQuery } from '@tanstack/react-query';
import Loading from '@ui/components/loading';
import { PostSkeleton } from './[...param]';
import { useInView } from 'react-intersection-observer';
import Head from 'next/head';
import PostList from '../components/post-list';
import { getSimilarPosts } from '@transaction/lib/bridge';
import AISearchInput from '../components/ai-search-input';

export const getServerSideProps: GetServerSideProps = getDefaultProps;

const TAB_TITLE = 'Search - Hive';
export default function SearchPage() {
  const router = useRouter();
  const query = router.query.q as string;

  const { data, isLoading } = useQuery(['posts', query], () => getSimilarPosts(query), {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: !!router.query.q
  });

  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>
      {/* <div className="flex flex-col gap-12 px-4 py-8">
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
          entriesData.pages.map((data, i) => (
            <ul key={i}>
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
      </div> */}
      <div className="m-auto flex max-w-4xl flex-col gap-12 px-4 py-8">
        <div className="flex flex-col gap-4 lg:hidden">
          <AISearchInput />
        </div>
        {!query ? null : isLoading ? <Loading loading={isLoading} /> : data ? <PostList data={data} /> : null}
      </div>
    </>
  );
}
