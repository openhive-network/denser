import { SearchSort } from '@ui/hooks/use-search';
import SearchContent from './content';
import { searchPosts } from '@transaction/lib/hivesense-api';
import { getByText } from '@transaction/lib/hive-api';
import { getEffectiveObserverFromCookies, getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';
import { parseSearchParams } from '@ui/lib/search-params';
import { ObserverProvider } from '@/blog/components/observer-provider';
import type { PostStub } from '@hive/common-hiveio-packages/wax';
import type { CardEntry } from '@/blog/features/list-of-posts/lib/card-entry';
import { toCardEntries, toCardSearchResults } from '@/blog/features/list-of-posts/lib/to-card-entries';

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const logger = getLogger('app');

const SearchPage = async (props: SearchPageProps) => {
  const searchParams = await props.searchParams;
  const validatedParams = parseSearchParams(searchParams);
  const aiParam = validatedParams.ai;
  const classicQuery = validatedParams.q;
  const userTopicQuery = validatedParams.a;
  const topicQuery = validatedParams.p;
  const sortQuery = validatedParams.s as SearchSort | undefined;

  const observer = await getEffectiveObserverFromCookies();

  let initialAIResults: Array<CardEntry | PostStub> | null = null;
  let initialClassicResults: CardEntry[] | null = null;
  let initialTopicResults: CardEntry[] | null = null;

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

    const [aiResults, classicResults, topicResults] = results;
    initialAIResults =
      aiResults.status === 'fulfilled' && aiResults.value ? toCardSearchResults(aiResults.value) : null;
    initialClassicResults =
      classicResults.status === 'fulfilled' && classicResults.value ? toCardEntries(classicResults.value) : null;
    initialTopicResults =
      topicResults.status === 'fulfilled' && topicResults.value ? toCardEntries(topicResults.value) : null;
  } catch (error) {
    logger.error(error, 'Error in SearchPage:');
  }

  return (
    <ObserverProvider value={await getObserverFromCookies()} effectiveValue={observer}>
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
