import { Metadata } from 'next';
import PostContent from './content';
import { getPostCached } from '@/blog/lib/cached-api';
import { getCommunity, getDiscussion, getFollowList, getListCommunityRoles } from '@transaction/lib/bridge-api';
import { isTransportError } from '@transaction/lib/wax-errors';
import { ServiceUnavailableError } from '@/blog/lib/service-unavailable';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { isUsernameValid, isPermlinkValid, isValidUserParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import { isCommunity } from '@ui/lib/utils';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { buildDiscussionPageSeed, parseCommentSort } from '@/blog/features/post-rendering/lib/paginate-discussion';
import {
  ObserverProvider,
  InitialPostDataProvider,
  InitialDiscussionProvider,
  InitialCommunityProvider,
  InitialCommunityRolesProvider,
  InitialFollowListProvider
} from '@/blog/components/observer-provider';
import { RenderedBodiesProvider } from '@/blog/features/post-rendering/rendered-bodies-context';
import { renderDiscussionBodies } from '@/blog/features/post-rendering/lib/render-discussion-bodies';

const logger = getLogger('app');

const FALLBACK_METADATA: Metadata = {
  title: 'Hive',
  description: 'Hive: Communities Without Borders.',
  openGraph: {
    title: 'Hive',
    description: 'Hive: Communities Without Borders.'
  }
};

// generateMetadata lives on the PAGE (not the layout) on purpose: it resolves before
// the route's loading boundary starts streaming, so notFound() here still controls the
// HTTP status. Once streaming begins, the page body can no longer change it - that is
// the soft-404 mechanism behind #930. Pages (unlike layouts) also receive searchParams,
// which the ?pending post-creation escape needs. The post fetch is request-deduplicated
// with the page body via getPostCached (React cache()).
export async function generateMetadata(
  props: {
    params: Promise<{ param: string; p2: string; permlink: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!isValidUserParam(params?.p2)) notFound();
  const author = params.p2.replace('%40', '').replace('@', '');
  const permlink = params?.permlink;
  if (!(await isUsernameValid(author)) || !isPermlinkValid(permlink)) notFound();

  const observer = await getObserverFromCookies();
  let post = null;
  try {
    post = await getPostCached(author, permlink, observer);
  } catch (error) {
    if (isTransportError(error)) {
      // #926: a transport failure is not a 404. Fall through with fallback metadata
      // and let the page body surface the ServiceUnavailable error boundary.
      logger.error(error, 'Transport error fetching post for metadata:');
      return FALLBACK_METADATA;
    }
    // Non-transport rejection: hivemind reports "post does not exist" as a JSON-RPC
    // error over HTTP 200 - treat as missing.
    logger.error(error, 'Error in generateMetadata');
  }

  // Real 404 for genuinely missing posts; the ?pending escape covers the optimistic
  // render right after post creation, before hivemind has indexed it.
  if (!post && !searchParams?.pending) notFound();

  const title = post?.title ? `${post.title} ` : 'Hive Blog';
  const description =
    post?.json_metadata?.summary ||
    post?.json_metadata?.description ||
    (post?.body ? post.body.substring(0, 160) : '');
  const image =
    post?.json_metadata?.image?.[0] ||
    post?.json_metadata?.images?.[0] ||
    'https://hive.blog/images/hive-blog-share.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image]
    }
  };
}

const PostPage = async (
  props: {
    params: Promise<{ param: string; p2: string; permlink: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) => {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    param,
    p2,
    permlink
  } = params;

  if (!isValidUserParam(p2)) notFound();

  const username = p2.replace('%40', '').replace('@', '');
  const community = param;
  const validUser = await isUsernameValid(username);
  if (!validUser) notFound();
  if (!isPermlinkValid(permlink)) notFound();

  const observer = await getObserverFromCookies();

  const isLoggedIn = observer !== DEFAULT_OBSERVER;

  let postData = null;
  let discussionData = null;
  let communityData = null;
  let communityRolesData = null;
  let mutedListData = null;
  let postTransportError: unknown = null;

  try {
    // Fetch post, discussion, and optionally community and its roles in parallel.
    // The full voter list is not fetched here: the page shows only stats.total_votes
    // until the voters card is opened, which loads the list on demand.
    const [postResult, discussionResult, mutedListResult, communityResult, communityRolesResult] =
      await Promise.allSettled([
      // Use cached version — deduplicated with layout's generateMetadata within the same request
      getPostCached(username, permlink, observer),
      getDiscussion(username, permlink, observer),
      // Prefetch the user's muted list so comments are filtered from the first render
      isLoggedIn ? getFollowList(observer, 'muted') : Promise.resolve(null),
      isCommunity(community) ? getCommunity(community, observer) : Promise.resolve(null),
      isCommunity(community) ? getListCommunityRoles(community) : Promise.resolve(null)
    ]);

    if (postResult.status === 'fulfilled') {
      postData = postResult.value ?? null;
    } else {
      // A rejected post fetch is either a genuine "post does not exist" (hivemind returns that as
      // an HTTP-200 JSON-RPC error) or a transport failure (429/5xx/timeout/network). Only the
      // former is a real 404; a transport failure must surface as a 5xx, never a misleading 404.
      logger.error(postResult.reason, 'Error fetching post data:');
      if (isTransportError(postResult.reason)) {
        postTransportError = postResult.reason;
      }
    }

    discussionData = discussionResult.status === 'fulfilled' ? (discussionResult.value ?? null) : null;
    if (discussionResult.status === 'rejected') {
      logger.error(discussionResult.reason, 'Error fetching discussion data:');
    }
    if (isLoggedIn) {
      mutedListData = mutedListResult.status === 'fulfilled' ? (mutedListResult.value ?? null) : null;
      if (mutedListResult.status === 'rejected') {
        logger.error(mutedListResult.reason, 'Error fetching muted list:');
      }
    }

    if (isCommunity(community)) {
      communityData = communityResult.status === 'fulfilled' ? (communityResult.value ?? null) : null;
      if (communityResult.status === 'rejected') {
        logger.error(communityResult.reason, 'Error fetching community data:');
      }
      communityRolesData =
        communityRolesResult.status === 'fulfilled' ? (communityRolesResult.value ?? null) : null;
      if (communityRolesResult.status === 'rejected') {
        logger.error(communityRolesResult.reason, 'Error fetching community roles:');
      }
    }
  } catch (error) {
    logger.error(error, 'Error in PostPage:');
  }

  // A transport failure on the primary post fetch (node unreachable / overloaded / slow) must
  // surface as a 5xx via the route error boundary (ServiceUnavailable) — never a false 404 for
  // content that may well exist. See hive/denser#926.
  if (postTransportError) {
    throw new ServiceUnavailableError(postTransportError);
  }

  // Skip 404 when navigating from post creation — the client has optimistic data
  // in React Query cache that will render while Hivemind indexes the post.
  if (!postData && !searchParams?.pending) notFound();

  // Only the first comments page goes into the HTML and the RSC payload; the client fetches the
  // whole discussion when another page or sort order is requested.
  const sortParam = searchParams?.sort;
  const discussionPageSeed =
    discussionData && postData
      ? buildDiscussionPageSeed(
          discussionData,
          postData,
          parseCommentSort(Array.isArray(sortParam) ? sortParam[0] : sortParam)
        )
      : null;

  // Bodies are rendered here so the client hydrates their HTML instead of loading the
  // renderer and rendering them again.
  const renderedBodies = renderDiscussionBodies(postData, discussionData);

  // Pass data directly via context instead of Hydrate/dehydrate.
  // React Query v4's <Hydrate> has compatibility issues with Next.js App Router
  // streaming SSR where dehydrated state doesn't reliably reach the browser
  // query client, causing unnecessary client-side refetches and spinners.
  return (
    <ObserverProvider value={observer}>
      <InitialPostDataProvider value={postData}>
        <InitialDiscussionProvider value={discussionPageSeed}>
          <InitialCommunityProvider value={communityData}>
            <InitialCommunityRolesProvider value={communityRolesData}>
              <InitialFollowListProvider value={mutedListData}>
                <RenderedBodiesProvider value={renderedBodies}>
                  <PostContent />
                </RenderedBodiesProvider>
              </InitialFollowListProvider>
            </InitialCommunityRolesProvider>
          </InitialCommunityProvider>
        </InitialDiscussionProvider>
      </InitialPostDataProvider>
    </ObserverProvider>
  );
};
export default PostPage;
