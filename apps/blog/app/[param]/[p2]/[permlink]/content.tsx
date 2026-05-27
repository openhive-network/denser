'use client';

import BasePathLink from '@/blog/components/base-path-link';
import DialogLogin from '@/blog/components/dialog-login';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { usePinMutation, useUnpinMutation } from '@/blog/components/hooks/use-pin-mutations';
import NoDataError from '@/blog/components/no-data-error';
import OptimisticStatusBanner from '@/blog/components/optimistic-status-banner';
import PendingIndexingMessage from '@/blog/components/pending-indexing-message';
import ChangeTitleDialog from '@/blog/features/community-profile/change-title-dialog';
import DetailsCardHover from '@/blog/features/list-of-posts/details-card-hover';
import ReblogTrigger from '@/blog/features/list-of-posts/reblog-trigger';
import { useRebloggedByQuery } from '@/blog/features/list-of-posts/hooks/use-reblogged-by-query';
import { useDeletePostMutation } from '@/blog/features/post-editor/hooks/use-post-mutation';
import PostForm from '@/blog/features/post-editor/post-form';
import PostingLoader from '@/blog/features/post-editor/posting-loader';
import { ReplyTextbox } from '@/blog/features/post-editor/reply-textbox';
import { AlertDialogFlag } from '@/blog/features/post-rendering/alert-window-flag';
import CommentsSection from '@/blog/features/post-rendering/comments-section';
import ContextLinks from '@/blog/features/post-rendering/context-links';
import DetailsCardVoters from '@/blog/features/post-rendering/details-card-voters';
import FlagIcon from '@/blog/features/post-rendering/flag-icon';
import MutePostDialog from '@/blog/features/post-rendering/mute-post-dialog';
import PostBodySection from '@/blog/features/post-rendering/post-body-section';
import { PostDeleteDialog } from '@/blog/features/post-rendering/post-delete-dialog';
import { SharePost } from '@/blog/features/post-rendering/share-post-dialog';
import FacebookShare from '@/blog/features/post-rendering/share-post-facebook';
import LinkedInShare from '@/blog/features/post-rendering/share-post-linkedin';
import RedditShare from '@/blog/features/post-rendering/share-post-reddit';
import TwitterShare from '@/blog/features/post-rendering/share-post-twitter';
import UserInfo from '@/blog/features/post-rendering/user-info';
import { UserPopoverCard } from '@/blog/features/post-rendering/user-popover-card';
import AnimatedList from '@/blog/features/suggestions-posts/animated-tab';
import SuggestionsList from '@/blog/features/suggestions-posts/list';
import { useTranslation } from '@/blog/i18n/client';
import { postContainerClasses } from '@/blog/lib/post-layout-classes';
import sorter, { SortOrder } from '@/blog/lib/sorter';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { getBasePath } from '@ui/lib/path-utils';
import { useQuery } from '@tanstack/react-query';
import { getCommunity, getDiscussion, getListCommunityRoles, getPost } from '@transaction/lib/bridge-api';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { getActiveVotes } from '@transaction/lib/hive-api';
import { getSimilarPostsByPost, isPostStub } from '@transaction/lib/hivesense-api';
import { Badge } from '@ui/components/badge';
import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import Loading from '@ui/components/loading';
import TimeAgo from '@ui/components/time-ago';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import dmcaList from '@ui/config/lists/dmca-list';
import dmcaUserList from '@ui/config/lists/dmca-user-list';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import { handleError } from '@ui/lib/handle-error';
import parseDate from '@ui/lib/parse-date';
import { buildSafePath } from '@ui/lib/sanitize-url';
import { Clock, Link2 } from 'lucide-react';
import { Link } from '@hive/ui';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleSpinner } from 'react-spinners-kit';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import VotesComponentWrapper from '@/blog/features/votes/votes-component-wrapper';
import { isCommunity } from '@ui/lib/utils';
import {
  useSSRObserver,
  useInitialPostData,
  useInitialDiscussion,
  useInitialCommunity,
  useInitialFollowList
} from '@/blog/components/observer-provider';
import { StaleTime } from '@/blog/lib/react-query';

// Maximum number of comments per page
const MAX_COMMENTS_PER_PAGE = 50;

const PostContent = () => {
  const searchParams = useSearchParams();
  const params = useParams<{ param: string; p2: string; permlink: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const commentSort = searchParams?.get('sort') || 'trending';
  const author = params?.p2.replace('%40', '') ?? '';
  const category = params?.param ?? '';
  const permlink = params?.permlink ?? '';
  const { user, isHydrated } = useUserClient();
  const ssrObserver = useSSRObserver();
  const initialPostData = useInitialPostData();
  const initialDiscussion = useInitialDiscussion();
  const initialCommunity = useInitialCommunity();
  const initialMutedList = useInitialFollowList();
  // Use SSR observer before hydration to match prefetched cache keys,
  // then switch to client observer (which should be the same value for logged-in users)
  const clientObserver = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const observer = isHydrated ? clientObserver : ssrObserver;
  // Use empty key when user is not logged in to disable storage hooks
  const replyStorageId = user.username ? `replybox-/${author}/${permlink}-${user.username}` : '';
  const editStorageId = user.username ? `editbox-/${author}/${permlink}-${user.username}` : '';

  const { t } = useTranslation('common_blog');
  // Reply box state and drafts expire after 30 days
  // Empty key disables the hook entirely, preventing garbage entries
  const [storedReply, storeReply, removeReply] = useStorageWithTTL<boolean>(replyStorageId, false, StorageTTL.UI_STATE);
  const [storedEdit, storeEdit, removeEdit] = useStorageWithTTL<boolean>(editStorageId, false, StorageTTL.UI_STATE);
  const [storedComment] = useStorageWithTTL<string>(
    user.username ? `replyTo-/${author}/${permlink}-${user.username}` : '',
    '',
    StorageTTL.DRAFT
  );

  // Use stored values directly - no useState needed
  // This ensures proper hydration and cross-tab sync
  const reply = storedReply;
  const setReply = useCallback(
    (value: boolean) => {
      if (value) {
        storeReply(true);
      } else {
        removeReply();
      }
    },
    [storeReply, removeReply]
  );

  const edit = storedEdit;
  const setEdit = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const newValue = typeof value === 'function' ? value(storedEdit) : value;
      if (newValue) {
        storeEdit(true);
      } else {
        removeEdit();
      }
    },
    [storedEdit, storeEdit, removeEdit]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const postInCommunity = isCommunity(category);
  const { data: postData, isLoading: postIsLoading } = useQuery({
    queryKey: ['postData', author, permlink, observer],
    queryFn: () => getPost(author, permlink, observer),
    enabled: !!author && !!permlink,
    initialData: initialPostData ?? undefined,
    initialDataUpdatedAt: initialPostData ? Date.now() : undefined,
    staleTime: StaleTime.MEDIUM,
    onError: (error) => {
      handleError(error, { method: 'getPost', params: { author, permlink, observer } });
    }
  });
  const [mutedPost, setMutedPost] = useState<boolean>(postData?.stats?.gray || false);
  // Single reblog query shared by header and footer ReblogTrigger components
  const { data: isReblogged } = useRebloggedByQuery(
    postData?.author ?? '',
    postData?.permlink ?? '',
    user.username
  );
  const userFromGDPR = gdprUserList.some((e) => e === postData?.author);

  const crossedPost = Array.isArray(postData?.json_metadata?.tags) && postData.json_metadata.tags.includes('cross-post');
  const legalBlockedUser = userIllegalContent.some((e) => e === postData?.author);
  const copyRightCheck = dmcaList.includes(pathname ?? '');
  const { data: crossPostData } = useQuery({
    queryKey: [
      'postData',
      postData?.json_metadata.original_author,
      postData?.json_metadata.original_permlink,
      observer
    ],
    queryFn: () =>
      getPost(postData?.json_metadata.original_author, postData?.json_metadata.original_permlink, observer),
    enabled: crossedPost
  });

  const { data: suggestionData } = useQuery({
    queryKey: ['suggestions', author, permlink, observer],
    queryFn: async () => {
      const results = await getSimilarPostsByPost({
        author,
        permlink,
        observer,
        result_limit: 10, // Only get 10 suggestions
        full_posts: 10 // Get all as full posts
      });

      if (!results) return null;

      // Filter out null/invalid posts and only include full Entry objects (not stubs)
      const fullPosts = results.filter(
        (post) => post && !isPostStub(post) && (post as Entry).post_id
      ) as Entry[];
      return fullPosts;
    }
  });
  const communityObserverMatchesSSR = observer === ssrObserver;
  const useCommunityInitialData = initialCommunity && communityObserverMatchesSSR;
  const { data: communityData } = useQuery({
    queryKey: ['community', category, observer],
    queryFn: () => getCommunity(category, observer),
    enabled: postInCommunity,
    initialData: useCommunityInitialData ? initialCommunity : undefined,
    initialDataUpdatedAt: useCommunityInitialData ? Date.now() : undefined,
    staleTime: StaleTime.LONG,
    onError: (error) => {
      handleError(error, { method: 'getCommunity', params: { category, observer } });
    }
  });

  const { data: discussionData } = useQuery({
    queryKey: ['discussionData', author, permlink, observer],
    queryFn: () => getDiscussion(author, permlink, observer),
    initialData: initialDiscussion ?? undefined,
    initialDataUpdatedAt: initialDiscussion ? Date.now() : undefined,
    staleTime: StaleTime.MEDIUM,
    onError: (error) => {
      handleError(error, { method: 'getDiscussion', params: { author, permlink, observer } });
    }
  });
  const discussionState = useMemo(() => {
    if (!discussionData) return undefined;
    const list = [...Object.keys(discussionData).map((key) => discussionData[key])];
    const sortType = commentSort as SortOrder;
    sorter(list, sortType);
    return list;
  }, [discussionData, commentSort]);

  const paginatedDiscussionState = useMemo(() => {
    if (!discussionState || !postData) return undefined;

    // Build a map of comments by parent_author/parent_permlink for fast lookup
    const commentsByParent = new Map<string, Entry[]>();

    discussionState.forEach((comment) => {
      const parentKey = `${comment.parent_author}/${comment.parent_permlink}`;
      if (!commentsByParent.has(parentKey)) {
        commentsByParent.set(parentKey, []);
      }
      commentsByParent.get(parentKey)!.push(comment);
    });

    // Find all main comments (direct replies to the current post/comment)
    const mainComments = discussionState.filter(
      (comment) =>
        comment.depth === postData.depth + 1 &&
        comment.parent_author === postData.author &&
        comment.parent_permlink === postData.permlink
    );

    // Divide main comments into pages - maximum 50 comments total per page
    const mainPost = discussionState.find((c) => c.depth === 0);
    const pages: Set<number>[] = [];
    let currentPageIds = new Set<number>();
    let currentPageCount = mainPost ? 1 : 0;

    if (mainPost) {
      currentPageIds.add(mainPost.post_id);
    }

    for (const mainComment of mainComments) {
      // Estimate how many comments this main comment has (1 + nested)
      const parentKey = `${mainComment.author}/${mainComment.permlink}`;
      const directChildren = commentsByParent.get(parentKey) || [];
      // Simple estimate: main + direct children
      const estimatedCount = 1 + Math.min(directChildren.length, 10);

      // If adding this comment probably exceeds the limit, save the current page
      if (
        currentPageCount + estimatedCount > MAX_COMMENTS_PER_PAGE &&
        currentPageIds.size > (mainPost ? 1 : 0)
      ) {
        pages.push(currentPageIds);
        currentPageIds = new Set<number>();
        currentPageCount = mainPost ? 1 : 0;
        if (mainPost) {
          currentPageIds.add(mainPost.post_id);
        }
      }

      // Now collect actual comments with the limit
      const remainingLimit = MAX_COMMENTS_PER_PAGE - currentPageCount;
      if (remainingLimit <= 0) continue;

      currentPageIds.add(mainComment.post_id);
      currentPageCount++;

      // Collect nested comments with the limit (iteratively)
      const queue: Entry[] = [...directChildren].sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
      );
      const visited = new Set<number>([mainComment.post_id]);

      while (queue.length > 0 && currentPageCount < MAX_COMMENTS_PER_PAGE) {
        const current = queue.shift()!;
        if (visited.has(current.post_id)) continue;
        if (currentPageIds.has(current.post_id)) continue;

        visited.add(current.post_id);
        currentPageIds.add(current.post_id);
        currentPageCount++;

        // Add children of this comment to the queue
        const currentParentKey = `${current.author}/${current.permlink}`;
        const currentChildren = commentsByParent.get(currentParentKey) || [];
        const sortedCurrentChildren = [...currentChildren].sort(
          (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
        );
        queue.push(...sortedCurrentChildren);
      }
    }

    if (currentPageIds.size > (mainPost ? 1 : 0)) {
      pages.push(currentPageIds);
    }

    const totalPages = Math.max(1, pages.length);
    const validPage = Math.min(commentsPage, totalPages);
    const pageIncludedIds = pages[validPage - 1] || new Set<number>();

    // Always include the main post
    if (mainPost && !pageIncludedIds.has(mainPost.post_id)) {
      pageIncludedIds.add(mainPost.post_id);
    }

    // Create the final list using Set for O(1) lookup
    const paginatedComments = discussionState.filter((comment) => pageIncludedIds.has(comment.post_id));

    return {
      comments: paginatedComments,
      totalPages,
      currentPage: validPage,
      totalMainComments: mainComments.length
    };
  }, [discussionState, postData, commentsPage]);
  const firstPost = discussionState?.find((post) => post.depth === 0);
  const post_is_pinned = firstPost?.stats?.is_pinned ?? false;

  const thisPost = discussionState?.find((post) => post.permlink === permlink && postData?.author === author);
  // Use thisPost.depth if available, fallback to postData.depth (for optimistic posts), default to 0
  const postDepth = thisPost?.depth ?? postData?.depth ?? 0;
  const commentSite = postDepth !== 0;
  const userFromDMCA = dmcaUserList.some((e) => e === postData?.author);

  const { data: userCanModerate } = useQuery({
    queryKey: ['rolesList', category],
    queryFn: () => getListCommunityRoles(category),
    enabled: postInCommunity,
    onError: (error) => {
      handleError(error, { method: 'getListCommunityRoles', params: { category } });
    },
    select: (data) => {
      const userRole = data?.find((e) => e[0] === user.username);
      const userCanModerate = userRole
        ? userRole[1] === 'mod' || userRole[1] === 'admin' || userRole[1] === 'owner'
        : false;
      return userCanModerate;
    }
  });

  const { data: activeVotesData } = useQuery({
    queryKey: ['activeVotes'],
    queryFn: () => getActiveVotes(author, permlink),
    onError: (error) => {
      handleError(error, { method: 'getActiveVotes', params: { author, permlink } });
    }
  });

  const { data: mutedList } = useFollowListQuery(user.username, 'muted', initialMutedList);

  const pinMutations = usePinMutation();
  const unpinMutation = useUnpinMutation();

  const pin = async () => {
    try {
      await pinMutations.mutateAsync({ community: category, username: author, permlink });
    } catch (error) {
      handleError(error, { method: 'pin', params: { community: category, username: author, permlink } });
    }
  };
  const unpin = async () => {
    try {
      await unpinMutation.mutateAsync({ community: category, username: author, permlink });
    } catch (error) {
      handleError(error, { method: 'unpin', params: { community: category, username: author, permlink } });
    }
  };

  const deletePostMutation = useDeletePostMutation();
  const basepath = getBasePath();
  const deleteComment = async (permlink: string) => {
    try {
      await deletePostMutation.mutateAsync({ permlink });
      setIsSubmitting(true);
      // Wait 2 seconds before redirecting
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Use window.location for subdirectory deployments to ensure catch-all route works
      if (basepath) {
        // Security: Build path safely to prevent XSS
        const safePath = buildSafePath(basepath, `/@${author}/posts`);
        if (safePath) {
          window.location.href = safePath;
        } else {
          // Fallback to client navigation if path construction fails
          router.push(`/@${author}/posts`);
        }
      } else {
        // Use client-side navigation for root deployments (faster)
        router.push(`/@${author}/posts`);
      }
    } catch (error) {
      setIsSubmitting(false);
      handleError(error, { method: 'deleteComment', params: { permlink } });
    }
  };

  useEffect(() => {
    setMutedPost(postData?.stats?.gray ?? false);
  }, [postData?.stats?.gray]);

  // Reset comments pagination when the post changes
  useEffect(() => {
    setCommentsPage(1);
  }, [author, permlink]);

  // Stable callback for CommentsSection
  const handleSetCommentsPage = useCallback((page: number | ((prev: number) => number)) => {
    setCommentsPage(page);
  }, []);

  // Stable callback for PostBodySection
  const handleShowMutedContent = useCallback(() => {
    setMutedPost(false);
  }, []);

  const isPending = searchParams?.get('pending') === '1';
  if (userFromGDPR) return <NoDataError />;
  if (!postData && !postIsLoading) {
    if (isPending) return <PendingIndexingMessage author={author} permlink={permlink} observer={observer} />;
    return <NoDataError />;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12">
        <div className="col-span-2 hidden md:block">
          {suggestionData ? <AnimatedList suggestions={suggestionData} /> : null}
        </div>
        <div className="w-full min-w-0 py-8 md:col-span-8 md:mx-auto md:flex md:flex-col">
          <div className={postContainerClasses}>
            {crossedPost ? (
              <div className="mb-4 flex items-center gap-2 bg-background-secondary p-5 text-sm">
                <Icons.crossPost className="h-4 w-4" />
                <span>
                  <BasePathLink href={`/@${postData?.author}`} className="font-bold hover:text-destructive">
                    {postData?.author}{' '}
                  </BasePathLink>
                  cross-posted{' '}
                  <Link
                    href={`/@${postData?.json_metadata.original_author}/${postData?.json_metadata.original_permlink}`}
                    className="font-bold hover:text-destructive"
                  >
                    this post{' '}
                  </Link>
                  in{' '}
                  <Link href={`/created/${postData?.community}`} className="font-bold hover:text-destructive">
                    {postData?.community_title ?? postData?.community}
                  </Link>
                </span>
              </div>
            ) : null}
            {postData ? (
              <div>
                {/* Post Header Section */}
                <div className="mb-5 border-b border-border pb-5">
                  {!commentSite ? (
                    <div className="flex items-start justify-between gap-3">
                      <h1
                        className="font-sanspro text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl"
                        data-testid="article-title"
                      >
                        {postData.title}
                        {postData.percent_hbd === 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="ml-2 inline-flex items-center align-middle"
                                  data-testid="powered-up-100-trigger"
                                >
                                  <Icons.hive className="h-5 w-5 text-red-500" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent data-testid="powered-up-100-tooltip">
                                {t('cards.post_card.powered_up_100')}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </h1>
                      {postInCommunity && (
                        <div className="mt-1 shrink-0 cursor-pointer rounded-full border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-border hover:bg-background-secondary hover:text-destructive">
                          {!user.isLoggedIn ? (
                            <DialogLogin>
                              <FlagIcon onClick={() => {}} />
                            </DialogLogin>
                          ) : communityData ? (
                            <AlertDialogFlag
                              community={category}
                              username={author}
                              permlink={permlink}
                              flagText={communityData.flag_text}
                            >
                              <FlagIcon onClick={() => {}} />
                            </AlertDialogFlag>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : (
                    <ContextLinks
                      data={postData}
                      noContext={!!discussionState && !discussionState.some((e) => e.depth === 1)}
                    />
                  )}
                  {postData._optimistic && (
                    <OptimisticStatusBanner createdAt={postData.created} />
                  )}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <UserInfo
                      permlink={permlink}
                      moderateEnabled={!!userCanModerate}
                      author={crossPostData?.author ?? postData.author}
                      author_reputation={
                        crossPostData?.author_reputation ?? postData.author_reputation
                      }
                      author_title={postData.author_title}
                      authored={postData.json_metadata?.author}
                      community_title={
                        crossPostData?.community_title ?? communityData?.title ?? ''
                      }
                      community={crossPostData?.community ?? category}
                      category={postData.category}
                      created={postData.created}
                      blacklist={
                        firstPost ? firstPost.blacklists : thisPost ? thisPost.blacklists : postData.blacklists
                      }
                    />
                    {/* Reblog Button in Header */}
                    {!commentSite && (
                      <ReblogTrigger
                        author={postData.author}
                        permlink={postData.permlink}
                        dataTestidTooltipContent="post-header-reblog-tooltip"
                        dataTestidTooltipIcon="post-header-reblog-icon"
                        isReblogged={isReblogged}
                        showLabel
                      />
                    )}
                  </div>
                </div>
                {postIsLoading ? (
                  <Loading loading={postIsLoading} />
                ) : edit && commentSite && postData.parent_author && postData.parent_permlink ? (
                  <ReplyTextbox
                    editMode={edit}
                    onSetReply={setEdit}
                    username={postData.parent_author}
                    permlink={postData.permlink}
                    parentPermlink={postData.parent_permlink}
                    storageId={editStorageId}
                    comment={postData}
                    discussionAuthor={author}
                    discussionPermlink={permlink}
                    observer={observer}
                  />
                ) : edit ? (
                  <PostForm
                    username={postData.author}
                    editMode={edit}
                    setEditMode={setEdit}
                    sideBySidePreview={false}
                    post_s={postData}
                    refreshPage={() => {
                      router.replace(pathname || '/');
                    }}
                    setIsSubmitting={setIsSubmitting}
                  />
                ) : legalBlockedUser ? (
                  <div className="px-2 py-6">{t('global.unavailable_for_legal_reasons')}</div>
                ) : copyRightCheck || userFromDMCA ? (
                  <div className="px-2 py-6">{t('post_content.body.copyright')}</div>
                ) : (
                  <PostBodySection
                    body={postData.body}
                    author={postData.author}
                    permlink={postData.permlink}
                    mainPost={postData.depth === 0}
                    crossPostBody={crossPostData?.body}
                    mutedPost={mutedPost}
                    mutedReasons={postData.stats?.muted_reasons}
                    onShowMutedContent={handleShowMutedContent}
                  />
                )}
                {/* Tags Section */}
                <div className="clear-both mt-6 border-t border-border pt-5">
                  {!commentSite ? (
                    <ul className="flex flex-wrap gap-2" data-testid="hashtags-post">
                      {Array.isArray(postData.json_metadata?.tags) && postData.json_metadata.tags
                        .filter((e) => e !== postData.category && e !== '' && e !== postData.community)
                        .map((tag: string) => (
                          <li key={tag}>
                            <Link
                              href={`/trending/${tag}`}
                              className="inline-block rounded-full border border-border bg-background-secondary px-3 py-1 text-sm font-medium text-muted-foreground transition-all hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              #{tag}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>
                {/* Post Footer */}
                <div
                  className="mt-5 rounded-lg border border-border bg-background-secondary/20 px-4 py-3 text-sm text-primary"
                  data-testid="author-data-post-footer"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      <span title={String(parseDate(postData.created))} data-testid="post-footer-timestamp">
                        <TimeAgo date={postData.created} />
                      </span>
                      <span className="mx-1">·</span>
                      <span>{t('post_content.footer.in')}</span>
                      <span className="font-semibold text-destructive">
                        {postData.community_title ? (
                          <Link
                            href={`/trending/${crossPostData?.community ?? postData.community}`}
                            className="hover:underline"
                            data-testid="footer-comment-community-category-link"
                          >
                            {crossPostData?.community_title ?? postData.community_title}
                          </Link>
                        ) : (
                          <Link
                            href={`/trending/${postData.category}`}
                            className="hover:underline"
                            data-testid="footer-comment-community-category-link"
                          >
                            #{postData.category}
                          </Link>
                        )}
                      </span>
                      <span className="mx-1">·</span>
                      <span>{t('post_content.footer.by')}</span>
                      <div className="flex items-center">
                        <UserPopoverCard
                          author={postData.json_metadata.original_author ?? postData.author}
                          author_reputation={crossPostData?.author_reputation ?? postData.author_reputation}
                          blacklist={
                            firstPost
                              ? firstPost.blacklists
                              : thisPost
                                ? thisPost.blacklists
                                : postData.blacklists
                          }
                        />
                        {postData.author_title ? (
                          <Badge variant="outline" className="ml-1 border-destructive text-slate-500">
                            <span className="mr-1">{postData.author_title}</span>
                            <ChangeTitleDialog
                              community={category}
                              moderateEnabled={!!userCanModerate}
                              userOnList={postData.author}
                              title={postData.author_title ?? ''}
                              permlink={permlink}
                            />
                          </Badge>
                        ) : (
                          <ChangeTitleDialog
                            community={category}
                            moderateEnabled={!!userCanModerate}
                            userOnList={postData.author}
                            title={postData.author_title ?? ''}
                            permlink={permlink}
                          />
                        )}
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm">
                      <VotesComponentWrapper post={postData} type="post" />
                      <span className="h-4 w-px bg-border" />
                      <DetailsCardHover
                        post={postData}
                        decline={parseFloat(postData.max_accepted_payout) === 0}
                        post_page
                      >
                        <span
                          data-testid="comment-payout"
                          className={`font-bold text-destructive hover:cursor-pointer ${
                            parseFloat(postData.max_accepted_payout) === 0
                              ? '!text-gray-600 line-through'
                              : ''
                          }`}
                        >
                          ${postData.payout?.toFixed(2)}
                        </span>
                      </DetailsCardHover>
                      {activeVotesData && !!postData.stats?.total_votes && postData.stats?.total_votes !== 0 ? (
                        <>
                          <span className="h-4 w-px bg-border" />
                          <DetailsCardVoters post={postData}>
                            <span className="font-medium text-destructive">
                              {postData.stats?.total_votes > 1
                                ? t('post_content.footer.votes', { votes: postData.stats?.total_votes })
                                : t('post_content.footer.vote')}
                            </span>
                          </DetailsCardVoters>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {/* Actions Row */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2" data-testid="comment-respons-header">
                      <ReblogTrigger
                        author={postData.author}
                        permlink={postData.permlink}
                        dataTestidTooltipContent="post-footer-reblog-tooltip"
                        dataTestidTooltipIcon="post-footer-reblog-icon"
                        isReblogged={isReblogged}
                      />
                      <span className="text-border">|</span>
                      {user && user.isLoggedIn ? (
                        <>
                          <button
                            onClick={() => {
                              setReply(!reply);
                            }}
                            className="flex items-center font-medium text-destructive transition-colors hover:text-destructive/80"
                            data-testid="comment-reply"
                          >
                            {t('post_content.footer.reply')}
                          </button>
                          {pinMutations.isLoading || unpinMutation.isLoading ? (
                            <div className="ml-2">
                              <CircleSpinner
                                loading={pinMutations.isLoading || unpinMutation.isLoading}
                                size={18}
                                color="#dc2626"
                              />
                            </div>
                          ) : userCanModerate && postData.depth === 0 ? (
                            <div className="flex flex-col items-center">
                              {/* <button
                            disabled={postData.stats?._temporary}
                            className={clsx('ml-2 flex items-center text-destructive', {
                              'animate-pulse cursor-not-allowed text-destructive':
                                firstPost?.stats?._temporary
                            })}
                            onClick={post_is_pinned ? unpin : pin}
                          >
                            {post_is_pinned ? t('communities.unpin') : t('communities.pin')}
                          </button> */}
                              {/* TODO swap two button to one when api return stats.is_pinned,
                                temprary use two button to unpin and pin
                                */}
                              <button
                                className="ml-2 flex items-center text-destructive"
                                onClick={pin}
                                data-testid="post-pin-button"
                              >
                                {t('communities.pin')}
                              </button>
                              <button
                                className="ml-2 flex items-center text-destructive"
                                onClick={unpin}
                                data-testid="post-unpin-button"
                              >
                                {t('communities.unpin')}
                              </button>
                            </div>
                          ) : null}
                          {userCanModerate ? (
                            <MutePostDialog
                              comment={false}
                              community={category}
                              username={postData.author}
                              permlink={postData.permlink}
                              contentMuted={postData.stats?.gray ?? false}
                              discussionPermlink={postData.permlink}
                              discussionAuthor={postData.author}
                              temporaryDisable={postData.stats?._temporary}
                            />
                          ) : null}
                        </>
                      ) : (
                        <DialogLogin>
                          <button className="flex items-center text-destructive" data-testid="comment-reply">
                            {t('post_content.footer.reply')}
                          </button>
                        </DialogLogin>
                      )}
                      {postData.children === 0 &&
                      user.isLoggedIn &&
                      postData.author === user.username &&
                      new Date() < new Date(`${postData.payout_at}Z`) ? (
                        <>
                          <span className="mx-1">|</span>
                          <PostDeleteDialog
                            permlink={postData.permlink}
                            action={(permlink) => {
                              deleteComment(permlink);
                            }}
                            label="Post"
                          >
                            <button
                              disabled={edit || deletePostMutation.isLoading}
                              className="flex items-center text-destructive"
                              data-testid="comment-card-footer-delete"
                            >
                              {deletePostMutation.isLoading ? (
                                <CircleSpinner
                                  loading={deletePostMutation.isLoading}
                                  size={18}
                                  color="#dc2626"
                                />
                              ) : (
                                t('cards.comment_card.delete')
                              )}
                            </button>
                          </PostDeleteDialog>
                        </>
                      ) : null}
                      {user && user.isLoggedIn && postData.author === user.username && !edit ? (
                        <>
                          <span className="mx-1">|</span>
                          <button
                            onClick={() => {
                              setEdit(!edit);
                            }}
                            className="flex items-center text-destructive"
                            data-testid="post-edit"
                          >
                            {t('post_content.footer.edit')}
                          </button>
                        </>
                      ) : null}
                      <span className="text-border">|</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center" data-testid="comment-respons">
                            <Link href={postData.url} className="flex cursor-pointer items-center text-muted-foreground transition-colors hover:text-foreground">
                              {postData.children > 1 ? (
                                <Icons.messagesSquare className="mr-1 h-4 w-4" />
                              ) : (
                                <Icons.comment className="mr-1 h-4 w-4" />
                              )}
                              <span className="font-medium">{postData.children}</span>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent data-testid="post-footer-response-tooltip">
                            <p>
                              {postData.children === 0
                                ? t('post_content.footer.no_responses')
                                : postData.children === 1
                                  ? t('post_content.footer.response')
                                  : t('post_content.footer.responses', { responses: postData.children })}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {/* Share buttons */}
                    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
                      <FacebookShare url={postData.url} />
                      <TwitterShare title={postData.title} url={postData.url} />
                      <LinkedInShare title={postData.title} url={postData.url} />
                      <RedditShare title={postData.title} url={postData.url} />
                      <SharePost path={postData.url} title={postData.title}>
                        <Link2 className="h-[18px] w-[18px] cursor-pointer text-muted-foreground transition-colors hover:text-destructive" data-testid="share-post" />
                      </SharePost>
                    </div>
                  </div>
                </div>
                {reply && postData && user.isLoggedIn ? (
                  <div className="mt-4 px-4">
                    <ReplyTextbox
                      editMode={false}
                      onSetReply={setReply}
                      username={postData.author}
                      permlink={permlink}
                      storageId={replyStorageId}
                      comment={storedComment}
                      discussionAuthor={author}
                      discussionPermlink={permlink}
                      observer={observer}
                    />
                  </div>
                ) : null}
                {crossedPost ? (
                  <div className="mb-12 flex w-full justify-center">
                    <Link
                      href={`/@${postData.json_metadata.original_author}/${postData.json_metadata.original_permlink}`}
                    >
                      <Button variant="redHover">{`Browse to the original post by @${postData.json_metadata.original_author}`}</Button>
                    </Link>
                  </div>
                ) : null}
                <div className="md:hidden">
                  {!!suggestionData ? (
                    <div className="mt-6 border-t border-border pt-4">
                      <h2 className="mb-3 px-4 font-sanspro text-lg font-bold">
                        You Might Also Like
                      </h2>
                      <SuggestionsList suggestions={suggestionData} horizontal />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <Loading loading={postIsLoading} />
            )}
          </div>
          <div id="comments" className="flex" />
          {!!postData && paginatedDiscussionState ? (
            <CommentsSection
              postData={postData}
              paginatedDiscussionState={paginatedDiscussionState}
              userCanModerate={!!userCanModerate}
              mutedList={mutedList || initialMutedList || []}
              flagText={communityData?.flag_text}
              discussionAuthor={author}
              discussionPermlink={permlink}
              observer={observer}
              commentsPage={commentsPage}
              setCommentsPage={handleSetCommentsPage}
            />
          ) : null}
        </div>
        <div className="col-span-2" />
      </div>
      <PostingLoader isSubmitting={isSubmitting} />
    </>
  );
};
export default PostContent;
