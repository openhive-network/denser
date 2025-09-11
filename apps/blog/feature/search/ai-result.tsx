import { useQuery } from '@tanstack/react-query';
import Loading from '@ui/components/loading';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useTranslation } from 'next-i18next';
import { searchPosts, getPostsByIds, isPostStub } from '@/blog/lib/get-data';
import { Entry, PostStub } from '@transaction/lib/extended-hive.chain';
import { PER_PAGE } from './lib/utils';
import PostList from '@/blog/components/post-list';
import { Preferences } from '@/blog/lib/utils';
import PostCardSkeleton from '@ui/components/card-skeleton';

const AIResult = ({ query, nsfwPreferences }: { query: string; nsfwPreferences: Preferences['nsfw'] }) => {
  const { user } = useUser();
  const { ref, inView } = useInView();
  const { t } = useTranslation('common_blog');
  
  const [currentPage, setCurrentPage] = useState(0);
  const [displayedPosts, setDisplayedPosts] = useState<Entry[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch all results in a single call
  const { data: searchResults, isLoading, isFetching, error } = useQuery(
    ['searchPosts', query],
    async () => {
      if (!query) return null;
      
      return await searchPosts({
        query,
        observer: user.username !== '' ? user.username : 'hive.blog',
        result_limit: 1000, // Get up to 1000 results
        full_posts: PER_PAGE // Get first page fully expanded
        // Remove explicit truncate: 0 to use default of 100
      });
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      enabled: !!query,
      staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    }
  );

  // Separate full posts and stubs
  const { fullPosts, stubPosts } = useMemo(() => {
    if (!searchResults) return { fullPosts: [], stubPosts: [] };
    
    const full: Entry[] = [];
    const stubs: PostStub[] = [];
    
    searchResults.forEach(post => {
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

  // Initialize displayed posts with full posts from initial response
  useEffect(() => {
    if (fullPosts.length > 0 && displayedPosts.length === 0) {
      setDisplayedPosts(fullPosts);
      setCurrentPage(1);
    }
  }, [fullPosts]);

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
        observer: user.username !== '' ? user.username : 'hive.blog'
        // Remove explicit truncate: 0 to use default of 100
      });
      
      if (fullPostData) {
        // Filter out null or invalid posts before adding to displayed posts
        const validPosts = fullPostData.filter(post => post && post.post_id);
        if (validPosts.length > 0) {
          setDisplayedPosts(prev => [...prev, ...validPosts]);
        }
        setCurrentPage(prev => prev + 1);
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

  // Reset on query change
  useEffect(() => {
    setCurrentPage(0);
    setDisplayedPosts([]);
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
      {displayedPosts.length > 0 && (
        <PostList data={displayedPosts} nsfwPreferences={nsfwPreferences} />
      )}
      
      <div>
        <button
          ref={ref}
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isLoadingMore}
          style={{ display: hasNextPage ? 'block' : 'none' }}
        >
          {isLoadingMore ? (
            <PostCardSkeleton />
          ) : hasNextPage ? (
            t('user_profile.load_newer')
          ) : null}
        </button>
        
        {!hasNextPage && displayedPosts.length > 0 && (
          <div>{t('user_profile.nothing_more_to_load')}</div>
        )}
      </div>
      
      {isFetching && !isLoadingMore && (
        <div>Background Updating...</div>
      )}
    </div>
  );
};

export default AIResult;