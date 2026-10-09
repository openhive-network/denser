'use client';

import { useQuery } from '@tanstack/react-query';
import Loading from '@ui/components/loading';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState, useMemo } from 'react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { PostStub } from '@hive/common-hiveio-packages/wax';
import { PER_PAGE } from './lib/utils';
import { Preferences } from '@/blog/lib/utils';
import { PostListItemSkeleton } from '@hive/ui';
import { StaleTime } from '@/blog/lib/react-query';
import { useSSREffectiveObserver } from '@/blog/components/observer-provider';
import { useEffectiveObserver } from '@/blog/components/hooks/use-effective-observer';

import PostList from '../list-of-posts/posts-loader';
import { CardEntry, loadCardEntries } from '../list-of-posts/lib/card-entry';
import { useTranslation } from '@/blog/i18n/client';
import { getPostsByIds, searchPosts } from '@transaction/lib/hivesense-api';
import {
  isRenderableSearchEntry,
  nextAiSearchPageState,
  partitionHiveSensePosts,
  promiseWithTimeout,
  AI_SEARCH_REQUEST_TIMEOUT_MS
} from '@transaction/lib/hivesense-search';

const AIResult = ({
  query,
  nsfwPreferences,
  initialData
}: {
  query: string;
  nsfwPreferences: Preferences['nsfw'];
  initialData?: Array<CardEntry | PostStub> | null;
}) => {
  const ssrObserver = useSSREffectiveObserver();
  const { isHydrated } = useUserClient();
  const { ref, inView } = useInView();
  const { t } = useTranslation('common_blog');

  // Use SSR observer (from cookie) before hydration to match the prefetched
  // initialData and avoid sending DEFAULT_OBSERVER for a logged-in user during
  // the brief pre-hydration window.
  const { effectiveObserver: clientObserver } = useEffectiveObserver();
  const observer = isHydrated ? clientObserver : ssrObserver;
  const [loadedStubPosts, setLoadedStubPosts] = useState<CardEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [consecutiveEmptyPages, setConsecutiveEmptyPages] = useState(0);
  // Set when a page comes back empty or the request fails/times out, so the
  // in-view sentinel cannot keep requesting forever with nothing on screen.
  const [paginationStopped, setPaginationStopped] = useState(false);

  // Fetch all results in a single call
  const {
    data: searchResults,
    isPending,
    isFetching,
    error
  } = useQuery({
    queryKey: ['searchPosts', query, observer],
    queryFn: async () => {
      const [results, { toCardSearchResults }] = await Promise.all([
        promiseWithTimeout(
          searchPosts({
            query,
            observer,
            result_limit: 1000, // Get up to 1000 results
            full_posts: PER_PAGE // Get first page fully expanded
          }),
          AI_SEARCH_REQUEST_TIMEOUT_MS,
          'searchPosts'
        ),
        import('../list-of-posts/lib/to-card-entries')
      ]);
      return results ? toCardSearchResults(results) : null;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
    enabled: !!query,
    staleTime: StaleTime.LONG,
    initialData: initialData ?? undefined,
    initialDataUpdatedAt: initialData ? Date.now() : undefined
  });

  // Separate full posts and stubs from search results
  const { fullPosts, stubPosts } = useMemo(() => {
    const parts = partitionHiveSensePosts(searchResults);
    return {
      fullPosts: parts.fullPosts as CardEntry[],
      stubPosts: parts.stubPosts as PostStub[]
    };
  }, [searchResults]);

  // Combine initial full posts with additionally loaded stub posts
  // This ensures data persists when navigating back (fullPosts comes from React Query cache)
  const displayedPosts = useMemo(() => {
    return [...fullPosts, ...loadedStubPosts];
  }, [fullPosts, loadedStubPosts]);

  // Calculate if there are more posts to load
  const hasNextPage = useMemo(() => {
    const startIndex = (currentPage - 1) * PER_PAGE;
    return startIndex < stubPosts.length;
  }, [currentPage, stubPosts]);

  // Load next page of posts
  const fetchNextPage = async () => {
    if (!hasNextPage || isLoadingMore || paginationStopped) return;

    setIsLoadingMore(true);

    try {
      // Calculate which stubs to fetch
      const startIndex = (currentPage - 1) * PER_PAGE;
      const endIndex = Math.min(startIndex + PER_PAGE, stubPosts.length);
      const stubsToFetch = stubPosts.slice(startIndex, endIndex);

      if (stubsToFetch.length === 0) {
        setPaginationStopped(true);
        setIsLoadingMore(false);
        return;
      }

      // Fetch full post data for the stubs. Timeout so a hung by-ids call
      // surfaces a fallback instead of a blank page (#947).
      const fullPostData = await loadCardEntries(
        promiseWithTimeout(
          getPostsByIds({
            posts: stubsToFetch,
            observer
          }),
          AI_SEARCH_REQUEST_TIMEOUT_MS,
          'getPostsByIds'
        )
      );

      const validPosts = Array.isArray(fullPostData)
        ? fullPostData.filter((post) => isRenderableSearchEntry(post))
        : [];
      if (validPosts.length > 0) {
        setLoadedStubPosts((prev) => [...prev, ...validPosts]);
      }
      const next = nextAiSearchPageState({
        currentPage,
        validCount: validPosts.length,
        consecutiveEmpty: consecutiveEmptyPages
      });
      setCurrentPage(next.currentPage);
      setConsecutiveEmptyPages(next.consecutiveEmpty);
      if (next.stop) setPaginationStopped(true);
    } catch (error) {
      console.error('Error fetching next page:', error);
      setPaginationStopped(true);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Auto-load when scrolling to bottom. Stop once a page produced nothing
  // visible — otherwise the sentinel stays in view and refires forever (#949).
  useEffect(() => {
    if (inView && hasNextPage && !isLoadingMore && !paginationStopped) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isLoadingMore, paginationStopped]);

  // Reset loaded stub posts on query change
  useEffect(() => {
    setCurrentPage(1);
    setLoadedStubPosts([]);
    setConsecutiveEmptyPages(0);
    setPaginationStopped(false);
  }, [query]);

  if (!query) return null;

  if (isPending) {
    return <Loading loading={isPending} />;
  }

  const classicHref = `/search?q=${encodeURIComponent(query)}&s=relevance`;

  if (error) {
    return (
      <div data-testid="ai-search-error">
        <p>{t('search_page.ai_unavailable')}</p>
        <a href={classicHref}>{t('search_page.try_classic')}</a>
      </div>
    );
  }

  if (!searchResults || searchResults.length === 0) {
    return <div>{t('search_page.no_results')}</div>;
  }

  // Results came back but none of them can be rendered (and we are not still
  // fetching a stub page). Say so instead of leaving the page blank.
  if (displayedPosts.length === 0 && !isLoadingMore && (!hasNextPage || paginationStopped)) {
    return (
      <div data-testid="ai-search-empty">
        <p>{paginationStopped ? t('search_page.ai_unavailable') : t('search_page.no_results')}</p>
        <a href={classicHref}>{t('search_page.try_classic')}</a>
      </div>
    );
  }

  return (
    <div>
      {displayedPosts.length > 0 && <PostList data={displayedPosts} nsfwPreferences={nsfwPreferences} />}

      <div>
        <button
          ref={ref}
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isLoadingMore || paginationStopped}
          style={{ display: hasNextPage && !paginationStopped ? 'block' : 'none' }}
        >
          {isLoadingMore ? <PostListItemSkeleton /> : hasNextPage ? t('user_profile.load_newer') : null}
        </button>

        {paginationStopped && hasNextPage && displayedPosts.length > 0 && (
          <div data-testid="ai-search-load-more-failed">{t('search_page.could_not_load_more')}</div>
        )}

        {!hasNextPage && displayedPosts.length > 0 && <div>{t('user_profile.nothing_more_to_load')}</div>}
      </div>

      {isFetching && !isLoadingMore && <div>Background Updating...</div>}
    </div>
  );
};

export default AIResult;
