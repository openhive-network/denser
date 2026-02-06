import { SearchSort } from '@ui/hooks/use-search';
import SearchContent from './content';
import { searchPosts } from '@transaction/lib/hivesense-api';
import { getByText } from '@transaction/lib/hive-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';
import { parseSearchParams } from '@ui/lib/search-params';
import { ObserverProvider } from '@/blog/components/observer-provider';
import type { Entry, MixedPostsResponse } from '@hive/common-hiveio-packages/wax';

interface SearchPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

const logger = getLogger('app');

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const validatedParams = parseSearchParams(searchParams);
  const aiParam = validatedParams.ai;
  const classicQuery = validatedParams.q;
  const userTopicQuery = validatedParams.a;
  const topicQuery = validatedParams.p;
  const sortQuery = validatedParams.s as SearchSort | undefined;

  const observer = await getObserverFromCookies();

  let initialAIResults: MixedPostsResponse | null = null;
  let initialClassicResults: Entry[] | null = null;
  let initialTopicResults: Entry[] | null = null;

  try {
    const results = await Promise.allSettled([
      aiParam
        ? searchPosts({ query: aiParam, observer, result_limit: 1000, full_posts: 20 })
        : Promise.resolve(null),
      classicQuery && sortQuery
        ? getByText({
            pattern: classicQuery,
            observer,
            start_permlink: '',
            start_author: '',
            limit: 20,
            sort: sortQuery
          })
        : Promise.resolve(null),
      userTopicQuery && topicQuery && sortQuery
        ? getByText({
            pattern: topicQuery,
            author: userTopicQuery,
            observer,
            start_permlink: '',
            start_author: '',
            limit: 20,
            sort: sortQuery
          })
        : Promise.resolve(null)
    ]);

    initialAIResults = results[0].status === 'fulfilled' ? (results[0].value ?? null) : null;
    initialClassicResults = results[1].status === 'fulfilled' ? (results[1].value ?? null) : null;
    initialTopicResults = results[2].status === 'fulfilled' ? (results[2].value ?? null) : null;
  } catch (error) {
    logger.error(error, 'Error in SearchPage:');
  }

  return (
    <ObserverProvider value={observer}>
      <SearchContent
        aiParam={aiParam}
        classicQuery={classicQuery}
        userTopicQuery={userTopicQuery}
        topicQuery={topicQuery}
        sortQuery={sortQuery}
        initialAIResults={initialAIResults}
        initialClassicResults={initialClassicResults}
        initialTopicResults={initialTopicResults}
      />
    </ObserverProvider>
  );
};

export default SearchPage;
