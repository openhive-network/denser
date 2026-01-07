'use client';

import { useQuery } from '@tanstack/react-query';
import Loading from '@ui/components/loading';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState, useMemo } from 'react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Entry, PostStub } from '@transaction/lib/extended-hive.chain';
import { PER_PAGE } from './lib/utils';
import { DEFAULT_OBSERVER, Preferences } from '@/blog/lib/utils';
import PostCardSkeleton from '@ui/components/card-skeleton';
import { commonVariables } from '@ui/lib/common-variables';

import PostList from '../list-of-posts/posts-loader';
import { useTranslation } from '@/blog/i18n/client';
import { getPostsByIds, isPostStub, searchPosts } from '@transaction/lib/hivesense-api';

const AIResult = ({ query, nsfwPreferences }: { query: string; nsfwPreferences: Preferences['nsfw'] }) => {
  const { user } = useUserClient();
  const { ref, inView } = useInView();
  const { t } = useTranslation('common_blog');

  const observer = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const [loadedStubPosts, setLoadedStubPosts] = useState<Entry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch all results in a single call
  const {
    data: searchResults,
    isLoading,
    isFetching,
    error
  } = useQuery({
    queryKey: ['searchPosts', query],
    queryFn: async () => {
      return await searchPosts({
        query,
        observer: user.username !== '' ? user.username : commonVariables.defaultObserver,
        result_limit: 1000, // Get up to 1000 results
        full_posts: PER_PAGE // Get first page fully expanded
      });
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: !!query,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Separate full posts and stubs from search results
  const { fullPosts, stubPosts } = useMemo(() => {
    if (!searchResults) return { fullPosts: [], stubPosts: [] };

    const full: Entry[] = [];
    const stubs: PostStub[] = [];

    searchResults.forEach((post) => {
      // Filter out null or invalid posts
      if (!post) return;

      if (isPostStub(post)) {
        stubs.push(post);
      } else {
        // Only check post_id for full Entry objects
        if ((post as Entry).post_id) {
          full.push(post as Entry);
        }
      }
    });

    return { fullPosts: full, stubPosts: stubs };
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
    if (!hasNextPage || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      // Calculate which stubs to fetch
      const startIndex = (currentPage - 1) * PER_PAGE;
      const endIndex = Math.min(startIndex + PER_PAGE, stubPosts.length);
      const stubsToFetch = stubPosts.slice(startIndex, endIndex);

      if (stubsToFetch.length === 0) {
        setIsLoadingMore(false);
        return;
      }

      // Fetch full post data for the stubs
      const fullPostData = await getPostsByIds({
        posts: stubsToFetch,
        observer
      });

      if (fullPostData) {
        // Filter out null or invalid posts before adding to loaded posts
        const validPosts = fullPostData.filter((post) => post && post.post_id);
        if (validPosts.length > 0) {
          setLoadedStubPosts((prev) => [...prev, ...validPosts]);
        }
        setCurrentPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching next page:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Auto-load when scrolling to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isLoadingMore) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isLoadingMore]);

  // Reset loaded stub posts on query change
  useEffect(() => {
    setCurrentPage(1);
    setLoadedStubPosts([]);
  }, [query]);

  if (!query) return null;

  if (isLoading) {
    return <Loading loading={isLoading} />;
  }

  if (error) {
    return <div>Error loading search results</div>;
  }

  if (!searchResults || searchResults.length === 0) {
    return <div>{t('search.no_results')}</div>;
  }

  return (
    <div>
      {displayedPosts.length > 0 && <PostList data={displayedPosts} nsfwPreferences={nsfwPreferences} />}

      <div>
        <button
          ref={ref}
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isLoadingMore}
          style={{ display: hasNextPage ? 'block' : 'none' }}
        >
          {isLoadingMore ? <PostCardSkeleton /> : hasNextPage ? t('user_profile.load_newer') : null}
        </button>

        {!hasNextPage && displayedPosts.length > 0 && <div>{t('user_profile.nothing_more_to_load')}</div>}
      </div>

      {isFetching && !isLoadingMore && <div>Background Updating...</div>}
    </div>
  );
};

export default AIResult;
