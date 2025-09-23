import parseDate from '@ui/lib/parse-date';
import { Clock, Link2 } from 'lucide-react';
import UserInfo from '@/blog/components/user-info';
import { getActiveVotes } from '@transaction/lib/hive';
import { dehydrate, useQuery } from '@tanstack/react-query';
import {
  getCommunity,
  getDiscussion,
  getFollowList,
  getListCommunityRoles,
  getPost
} from '@transaction/lib/bridge';
import Loading from '@hive/ui/components/loading';
import ImageGallery from '@/blog/components/image-gallery';
import Link from 'next/link';
import BasePathLink from '@/blog/components/base-path-link';
import DetailsCardHover from '@/blog/components/details-card-hover';
import DetailsCardVoters from '@/blog/components/details-card-voters';
import CommentSelectFilter from '@/blog/components/comment-select-filter';
import { useEffect, useMemo, useState } from 'react';
import sorter, { SortOrder } from '@/blog/lib/sorter';
import { useRouter } from 'next/router';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { Icons } from '@ui/components/icons';
import { ReplyTextbox } from '@/blog/components/reply-textbox';
import { SharePost } from '@/blog/components/share-post-dialog';
import LinkedInShare from '@/blog/components/share-post-linkedin';
import FacebookShare from '@/blog/components/share-post-facebook';
import RedditShare from '@/blog/components/share-post-reddit';
import TwitterShare from '@/blog/components/share-post-twitter';
import { Badge } from '@ui/components/badge';
import { Button } from '@ui/components/button';
import { Separator } from '@ui/components';
import { useTranslation } from 'next-i18next';
import { AlertDialogFlag } from '@/blog/components/alert-window-flag';
import VotesComponent from '@/blog/components/votes';
import { useLocalStorage } from 'usehooks-ts';
import PostForm from '@/blog/feature/post-editor/post-form';
import { useUser } from '@smart-signer/lib/auth/use-user';
import DialogLogin from '@/blog/components/dialog-login';
import { UserPopoverCard } from '@/blog/components/user-popover-card';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import dmcaUserList from '@ui/config/lists/dmca-user-list';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import dmcaList from '@ui/config/lists/dmca-list';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import RendererContainer from '@/blog/components/rendererContainer';
import { getLogger } from '@ui/lib/logging';
import ReblogTrigger from '@/blog/components/reblog-trigger';
import { getTranslations, MetadataProps } from '@/blog/lib/get-translations';
import Head from 'next/head';
import { usePinMutation, useUnpinMutation } from '@/blog/components/hooks/use-pin-mutations';
import { handleError } from '@ui/lib/handle-error';
import MutePostDialog from '@/blog/components/mute-post-dialog';
import { CircleSpinner } from 'react-spinners-kit';
import ChangeTitleDialog from '@/blog/components/change-title-dialog';
import moment from 'moment';
import { PostDeleteDialog } from '@/blog/components/post-delete-dialog';
import { useDeletePostMutation } from '@/blog/components/hooks/use-post-mutation';
import FlagIcon from '@/blog/components/flag-icon';
import { getSimilarPostsByPost, isPostStub } from '@/blog/lib/get-data';
import { Entry } from '@transaction/lib/extended-hive.chain';
import SuggestionsList from '@/blog/feature/suggestions-posts/list';
import TimeAgo from '@ui/components/time-ago';
import CommentList from '@/blog/components/comment-list';
import PostingLoader from '@/blog/components/posting-loader';
import NoDataError from '@/blog/components/no-data-error';
import AnimatedList from '@/blog/feature/suggestions-posts/animated-tab';
import { makeCanonicalLink } from '@ui/lib/canonical-url';
import { DEFAULT_FORM_VALUE, EditPostEntry } from '@/blog/feature/post-editor/lib/utils';
import { commonVariables } from '@ui/lib/common-variables';
import { getMutedComments } from '@/blog/lib/utils';

const logger = getLogger('app');
export const postClassName =
  'font-source text-[16.5px] prose-h1:text-[26.4px] prose-h2:text-[23.1px] prose-h3:text-[19.8px] prose-h4:text-[18.1px] sm:text-[17.6px] sm:prose-h1:text-[28px] sm:prose-h2:text-[24.7px] sm:prose-h3:text-[22.1px] sm:prose-h4:text-[19.4px] lg:text-[19.2px] lg:prose-h1:text-[30.7px] lg:prose-h2:text-[28.9px] lg:prose-h3:text-[23px] lg:prose-h4:text-[21.1px] prose-p:mb-6 prose-p:mt-0 prose-img:cursor-pointer';

function PostPage({
  community,
  username,
  permlink,
  mutedStatus,
  metadata,
  crosspost
}: {
  community: string;
  username: string;
  permlink: string;
  mutedStatus: boolean;
  metadata: MetadataProps;
  crosspost: {
    community: string;
    body: string;
    communityTag: string;
    authorReputation: number;
  };
}) {
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const { data: mutedList } = useFollowListQuery(user.username, 'muted');
  const { data: authorMutedList } = useFollowListQuery(username, 'muted');
  const mutedNames = authorMutedList?.map((e) => e.name) || [];
  const deletePostMutation = useDeletePostMutation();
  const { isLoading: isLoadingPost, data: post } = useQuery(
    ['postData', username, permlink],
    () => getPost(username, String(permlink)),
    {
      enabled: !!username && !!permlink
    }
  );

  const canonical_url = useMemo(() => {
    if (!post) return undefined;

    return makeCanonicalLink(post, post.json_metadata);
  }, [post]);

  const { data: suggestionResults } = useQuery(
    ['suggestions', username, permlink],
    async () => {
      const results = await getSimilarPostsByPost({
        author: username,
        permlink,
        observer: user.username !== '' ? user.username : commonVariables.defaultObserver,
        result_limit: 10, // Only get 10 suggestions
        full_posts: 10 // Get all as full posts
      });

      if (!results) return null;

      // Filter out null/invalid posts and only include full Entry objects (not stubs)
      const fullPosts = results.filter(
        (post) => post && !isPostStub(post) && (post as Entry).post_id
      ) as Entry[];
      return fullPosts;
    },
    {
      enabled: !!username && !!permlink
    }
  );

  const suggestions = suggestionResults;
  const { isLoading: isLoadingDiscussion, data: discussion } = useQuery(
    ['discussionData', permlink],
    () => getDiscussion(username, String(permlink), user.username),
    {
      select: (discussion) => {
        if (!discussion) return null;
        return getMutedComments(mutedNames, discussion);
      },
      enabled: !!username && !!permlink
    }
  );
  const { data: communityData } = useQuery(['community', community], () => getCommunity(community), {
    enabled: !!username && !!community && community.startsWith('hive-')
  });

  const { data: activeVotesData, isLoading: isActiveVotesLoading } = useQuery(
    ['activeVotes'],
    () => getActiveVotes(username, permlink),
    {
      enabled: !!username && !!permlink
    }
  );
  const { data: rolesData } = useQuery(['rolesList', community], () => getListCommunityRoles(community), {
    enabled: Boolean(community)
  });

  const userRole = rolesData?.find((e) => e[0] === user.username);
  const userCanModerate = userRole
    ? userRole[1] === 'mod' || userRole[1] === 'admin' || userRole[1] === 'owner'
    : false;
  const pinMutations = usePinMutation();
  const unpinMutation = useUnpinMutation();

  const pin = async () => {
    try {
      await pinMutations.mutateAsync({ community, username, permlink });
    } catch (error) {
      handleError(error, { method: 'pin', params: { community, username, permlink } });
    }
  };
  const unpin = async () => {
    try {
      await unpinMutation.mutateAsync({ community, username, permlink });
    } catch (error) {
      handleError(error, { method: 'unpin', params: { community, username, permlink } });
    }
  };
  const router = useRouter();
  const isSortOrder = (token: any): token is SortOrder => {
    return Object.values(SortOrder).includes(token as SortOrder);
  };
  const query = router.query.sort?.toString();
  const copyRightCheck = dmcaList.includes(
    `/${router.query.param}/${router.query.p2}/${router.query.permlink}`
  );
  const userFromDMCA = dmcaUserList.some((e) => e === post?.author);
  const legalBlockedUser = userIllegalContent.some((e) => e === post?.author);
  const defaultSort = isSortOrder(query) ? query : SortOrder.trending;
  const storageId = `replybox-/${username}/${post?.permlink}-${user.username}`;
  const [storedBox, storeBox, removeBox] = useLocalStorage<Boolean>(storageId, false);

  const [storedComment] = useLocalStorage<string>(`replyTo-/${username}/${permlink}-${user.username}`, '');
  const [reply, setReply] = useState<Boolean>(storedBox !== undefined ? storedBox : false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [edit, setEdit] = useState(false);

  const userFromGDPR = gdprUserList.some((e) => e === post?.author);

  useEffect(() => {
    if (reply) {
      storeBox(reply);
    }
  }, [reply, storeBox]);

  const discussionState = useMemo(() => {
    if (!discussion) return undefined;

    const list = [...Object.keys(discussion).map((key) => discussion[key])];
    const sortType = (router.query.sort as SortOrder) || defaultSort;
    sorter(list, SortOrder[sortType]);
    return list;
  }, [discussion, router.query.sort, defaultSort]);
  const firstPost = discussionState?.find((post) => post.depth === 0);
  const thisPost = discussionState?.find((post) => post.permlink === permlink && post.author === username);
  const commentSite = post?.depth !== 0 ? true : false;
  const [mutedPost, setMutedPost] = useState<boolean>(mutedStatus);
  useEffect(() => {
    setMutedPost(post?.stats?.gray ?? false);
  }, [post?.stats?.gray]);
  if (isLoadingPost) return <Loading loading={isLoadingPost} />;
  if (userFromGDPR || !post) return <NoDataError />;

  const deleteComment = async (permlink: string) => {
    try {
      await deletePostMutation.mutateAsync({ permlink });
      setIsSubmitting(true);
      // Wait 2 seconds before redirecting
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Use window.location for subdirectory deployments to ensure catch-all route works
      if (router.basePath) {
        window.location.href = `${router.basePath}/@${username}/posts`;
      } else {
        // Use client-side navigation for root deployments (faster)
        router.push(`/@${username}/posts`);
      }
    } catch (error) {
      setIsSubmitting(false);
      handleError(error, { method: 'deleteComment', params: { permlink } });
    }
  };
  const dialogAction = (permlink: string): void => {
    if (permlink) {
      deleteComment(permlink);
    }
  };

  const post_is_pinned = firstPost?.stats?.is_pinned ?? false;
  const crossedPost = post?.json_metadata.tags?.includes('cross-post');

  const editPostEntry: EditPostEntry = {
    title: post.title,
    author: post.author,
    category: post.category,
    postArea: post.body,
    postSummary: post.json_metadata?.summary ?? '',
    tags: post.json_metadata?.tags ? post.json_metadata.tags.join(' ') : '',
    selectedImg: post.json_metadata.image?.[0] ?? '',
    permlink: post.permlink
  };

  return (
    <>
      <Head>
        {canonical_url ? <link rel="canonical" href={canonical_url} key="canonical" /> : null}
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <div className="grid grid-cols-1 md:grid-cols-12">
        <div className="col-span-2 hidden md:block">
          {suggestions ? <AnimatedList suggestions={suggestions} /> : null}
        </div>
        <div className="py-8 sm:col-span-8 sm:mx-auto sm:flex sm:flex-col">
          <div className="relative mx-auto my-0 max-w-4xl bg-background p-4">
            {crossedPost ? (
              <div className="mb-4 flex items-center gap-2 bg-background-secondary p-5 text-sm">
                <Icons.crossPost className="h-4 w-4" />
                <span>
                  <BasePathLink href={`/@${post?.author}`} className="font-bold hover:text-destructive">
                    {post?.author}{' '}
                  </BasePathLink>
                  cross-posted{' '}
                  <Link
                    href={`/@${post?.json_metadata.original_author}/${post?.json_metadata.original_permlink}`}
                    className="font-bold hover:text-destructive"
                  >
                    this post{' '}
                  </Link>
                  in{' '}
                  <Link href={`/created/${post?.community}`} className="font-bold hover:text-destructive">
                    {post?.community_title ?? post?.community}
                  </Link>
                </span>
              </div>
            ) : null}
            <div className="absolute right-0 top-1 cursor-pointer hover:text-destructive">
              {communityData && !user.isLoggedIn ? (
                <DialogLogin>
                  <FlagIcon onClick={() => {}} />
                </DialogLogin>
              ) : communityData && user.isLoggedIn ? (
                <AlertDialogFlag
                  community={community}
                  username={username}
                  permlink={permlink}
                  flagText={communityData.flag_text}
                >
                  <FlagIcon onClick={() => {}} />
                </AlertDialogFlag>
              ) : null}
            </div>

            {!isLoadingPost && post ? (
              <div>
                {!commentSite ? (
                  <h1
                    className="font-sanspro text-[21px] font-extrabold sm:text-[25.6px]"
                    data-testid="article-title"
                  >
                    {post.title}
                  </h1>
                ) : (
                  <div className="flex flex-col gap-2 border-2 border-solid border-card-emptyBorder bg-card-noContent p-2">
                    <h4 className="text-sm">
                      {t('post_content.if_comment.you_are_viewing_a_single_comments_thread_from')}:
                    </h4>
                    <h1 data-testid="article-title" className="text-2xl">
                      {post.title}
                    </h1>
                    <Link
                      className="text-sm hover:text-destructive"
                      href={`${post.url}`}
                      data-testid="view-the-full-context"
                    >
                      • {t('post_content.if_comment.view_the_full_context')}
                    </Link>
                    {discussionState && !discussionState.some((e) => e.depth === 1) ? (
                      <Link
                        className="text-sm hover:text-destructive"
                        href={`/${post.category}/@${post.parent_author}/${post.parent_permlink}`}
                        data-testid="view-the-direct-parent"
                      >
                        • {t('post_content.if_comment.view_the_direct_parent')}
                      </Link>
                    ) : null}
                  </div>
                )}
                <UserInfo
                  permlink={permlink}
                  moderateEnabled={userCanModerate}
                  author={post.author}
                  author_reputation={crossedPost ? crosspost.authorReputation : post.author_reputation}
                  author_title={post.author_title}
                  authored={post.json_metadata?.author}
                  community_title={crossedPost ? crosspost.community : communityData?.title || ''}
                  community={crossedPost ? crosspost.communityTag : community}
                  category={post.category}
                  created={post.created}
                  blacklist={
                    firstPost ? firstPost.blacklists : thisPost ? thisPost.blacklists : post.blacklists
                  }
                />
                {isLoadingPost ? (
                  <Loading loading={isLoadingPost} />
                ) : edit && commentSite && post.parent_author && post.parent_permlink ? (
                  <ReplyTextbox
                    editMode={edit}
                    onSetReply={setEdit}
                    username={post.parent_author}
                    permlink={post.permlink}
                    parentPermlink={post.parent_permlink}
                    storageId={storageId}
                    comment={post}
                    discussionPermlink={permlink}
                  />
                ) : edit ? (
                  <PostForm
                    username={username}
                    editMode={edit}
                    setEditMode={setEdit}
                    setIsSubmitting={setIsSubmitting}
                    defaultValues={DEFAULT_FORM_VALUE}
                    entryValues={editPostEntry}
                  />
                ) : legalBlockedUser ? (
                  <div className="px-2 py-6">{t('global.unavailable_for_legal_reasons')}</div>
                ) : copyRightCheck || userFromDMCA ? (
                  <div className="px-2 py-6">{t('post_content.body.copyright')}</div>
                ) : mutedPost ? (
                  <>
                    <Separator />
                    <div className="my-8 flex items-center justify-between text-destructive">
                      {t('post_content.body.content_were_hidden')}
                      <Button variant="outlineRed" onClick={() => setMutedPost(false)}>
                        {t('post_content.body.show')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <ImageGallery>
                    <RendererContainer
                      mainPost={post.depth === 0}
                      body={crossedPost ? crosspost.body : post.body}
                      author={post.author}
                      className={postClassName}
                    />
                  </ImageGallery>
                )}
                <div className="clear-both">
                  {!commentSite ? (
                    <ul className="flex flex-wrap gap-2" data-testid="hashtags-post">
                      {post.json_metadata.tags
                        ?.filter((e) => e !== post.category && e !== '' && e !== post.community)
                        .map((tag: string) => (
                          <li key={tag}>
                            <Link
                              href={`/trending/${tag}`}
                              className="my-2 rounded-md border-[1px] border-border bg-background-secondary px-2 py-1 text-[14px] hover:border-[#788187]"
                            >
                              #{tag}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>
                <div
                  className="flex flex-col items-start text-sm text-primary sm:flex-row sm:justify-between"
                  data-testid="author-data-post-footer"
                >
                  <div className="my-4 flex flex-wrap gap-4">
                    <div className="flex flex-wrap items-center">
                      <Clock className="h-4 w-4" />
                      <span className="px-1" title={String(parseDate(post.created))}>
                        <TimeAgo date={post.created} />
                      </span>
                      {t('post_content.footer.in')}
                      <span className="px-1 text-destructive">
                        {post.community_title ? (
                          <Link
                            href={`/trending/${crossedPost ? crosspost.communityTag : post.community}`}
                            className="hover:cursor-pointer"
                            data-testid="footer-comment-community-category-link"
                          >
                            {crossedPost ? crosspost.community : post.community_title}
                          </Link>
                        ) : (
                          <Link
                            href={`/trending/${post.category}`}
                            className="hover:cursor-pointer"
                            data-testid="footer-comment-community-category-link"
                          >
                            #{post.category}
                          </Link>
                        )}
                      </span>
                      {t('post_content.footer.by')}
                      <div className="flex">
                        <UserPopoverCard
                          author={post.json_metadata.original_author ?? post.author}
                          author_reputation={
                            crossedPost ? crosspost.authorReputation : post.author_reputation
                          }
                          blacklist={
                            firstPost
                              ? firstPost.blacklists
                              : thisPost
                                ? thisPost.blacklists
                                : post.blacklists
                          }
                        />
                        {post.author_title ? (
                          <Badge variant="outline" className="border-destructive text-slate-500">
                            <span className="mr-1">{post.author_title}</span>
                            <ChangeTitleDialog
                              community={community}
                              moderateEnabled={userCanModerate}
                              userOnList={post.author}
                              title={post.author_title ?? ''}
                              permlink={permlink}
                            />
                          </Badge>
                        ) : (
                          <ChangeTitleDialog
                            community={community}
                            moderateEnabled={userCanModerate}
                            userOnList={post.author}
                            title={post.author_title ?? ''}
                            permlink={permlink}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <VotesComponent post={post} type="post" />
                      <DetailsCardHover
                        post={post}
                        decline={Number(post.max_accepted_payout.slice(0, 1)) === 0}
                        post_page
                      >
                        <span
                          data-testid="comment-payout"
                          className={`text-xs text-destructive hover:cursor-pointer sm:text-sm ${
                            Number(post.max_accepted_payout.slice(0, 1)) === 0
                              ? '!text-gray-600 line-through'
                              : ''
                          }`}
                        >
                          ${post.payout?.toFixed(2)}
                        </span>
                      </DetailsCardHover>
                      {!isActiveVotesLoading && activeVotesData ? (
                        <DetailsCardVoters post={post}>
                          {post.stats?.total_votes && post.stats?.total_votes !== 0 ? (
                            <span className="text-xs text-destructive sm:text-sm">
                              {post.stats?.total_votes > 1
                                ? t('post_content.footer.votes', { votes: post.stats?.total_votes })
                                : t('post_content.footer.vote')}
                            </span>
                          ) : null}
                        </DetailsCardVoters>
                      ) : null}
                    </div>
                  </div>
                  <div className="my-4 flex items-end gap-4 sm:flex-col">
                    <div className="flex items-center" data-testid="comment-respons-header">
                      <ReblogTrigger
                        author={post.author}
                        permlink={post.permlink}
                        dataTestidTooltipContent="post-footer-reblog-tooltip"
                        dataTestidTooltipIcon="post-footer-reblog-icon"
                      />
                      <span className="mx-1">|</span>
                      {user && user.isLoggedIn ? (
                        <>
                          <button
                            onClick={() => {
                              setReply(!reply), removeBox();
                            }}
                            className="flex items-center text-destructive"
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
                          ) : userCanModerate && post.depth === 0 ? (
                            <div className="flex flex-col items-center">
                              {/* <button
                                disabled={post.stats?._temporary}
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
                              <button className="ml-2 flex items-center text-destructive" onClick={pin}>
                                {t('communities.pin')}
                              </button>
                              <button className="ml-2 flex items-center text-destructive" onClick={unpin}>
                                {t('communities.unpin')}
                              </button>
                            </div>
                          ) : null}
                          {userCanModerate ? (
                            <MutePostDialog
                              comment={false}
                              community={community}
                              username={post.author}
                              permlink={post.permlink}
                              contentMuted={post.stats?.gray ?? false}
                              discussionPermlink={post.permlink}
                              discussionAuthor={post.author}
                              temporaryDisable={post.stats?._temporary}
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
                      {post.children === 0 &&
                      user.isLoggedIn &&
                      post.author === user.username &&
                      moment().format('YYYY-MM-DDTHH:mm:ss') < post.payout_at ? (
                        <>
                          <span className="mx-1">|</span>
                          <PostDeleteDialog permlink={post.permlink} action={dialogAction} label="Post">
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
                      {user && user.isLoggedIn && post.author === user.username && !edit ? (
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
                      <span className="mx-1">|</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center" data-testid="comment-respons">
                            <Link href={post.url} className="flex cursor-pointer items-center">
                              {post.children > 1 ? (
                                <Icons.messagesSquare className="mr-1 h-4 w-4" />
                              ) : (
                                <Icons.comment className="mr-1 h-4 w-4" />
                              )}
                            </Link>
                            <Link href={post.url} className="text- flex cursor-pointer items-center">
                              {post.children}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent data-testid="post-footer-response-tooltip">
                            <p>
                              {post.children === 0
                                ? t('post_content.footer.no_responses')
                                : post.children === 1
                                  ? t('post_content.footer.response')
                                  : t('post_content.footer.responses', { responses: post.children })}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2">
                      <FacebookShare url={post.url} />
                      <TwitterShare title={post.title} url={post.url} />
                      <LinkedInShare title={post.title} url={post.url} />
                      <RedditShare title={post.title} url={post.url} />
                      <SharePost path={router.asPath} title={post.title}>
                        <Link2 className="cursor-pointer hover:text-destructive" data-testid="share-post" />
                      </SharePost>
                    </div>
                  </div>
                </div>
                {crossedPost ? (
                  <div className="mb-12 flex w-full justify-center">
                    <Link
                      href={`/@${post.json_metadata.original_author}/${post.json_metadata.original_permlink}`}
                    >
                      <Button variant="redHover">{`Browse to the original post by @${post.json_metadata.original_author}`}</Button>
                    </Link>
                  </div>
                ) : null}
                <div className="col-span-2 md:hidden">
                  {suggestions ? (
                    <div className="flex flex-col overflow-x-auto md:sticky md:top-24 md:max-h-[calc(100vh-96px)]">
                      <h2 className="mb-4 mt-2 px-4 font-sanspro text-xl font-bold md:mt-0">
                        You Might Also Like
                      </h2>
                      <SuggestionsList suggestions={suggestions} />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <Loading loading={isLoadingPost} />
            )}
          </div>
          <div id="comments" className="flex" />
          <div>
            {reply && post && user.isLoggedIn ? (
              <ReplyTextbox
                editMode={edit}
                onSetReply={setReply}
                username={post.author}
                permlink={permlink}
                storageId={storageId}
                comment={storedComment}
                discussionPermlink={permlink}
              />
            ) : null}
          </div>
          {discussion && discussionState && post ? (
            <div className="max-w-4xl pr-2">
              <div className="my-1 flex items-center justify-end" translate="no">
                <span className="pr-1">{t('select_sort.sort_comments.sort')}</span>
                <CommentSelectFilter />
              </div>
              <CommentList
                highestAuthor={post.author}
                highestPermlink={post.permlink}
                permissionToMute={userCanModerate}
                mutedList={mutedList || []}
                data={discussionState}
                flagText={communityData?.flag_text}
                parent={post}
                parent_depth={post.depth}
                discussionPermlink={permlink}
              />
            </div>
          ) : (
            <Loading loading={isLoadingDiscussion} />
          )}
        </div>
        <div className="col-span-2" />
      </div>
      <PostingLoader isSubmitting={isSubmitting} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const community = String(ctx.query.param);
  const username = String(ctx.query.p2).slice(1);
  const permlink = String(ctx.query.permlink);

  const queryClient = new QueryClient();
  let post: Entry | undefined;
  let mutedStatus = false;
  let metadata = {
    tabTitle: '',
    description: '',
    image: '',
    title: ''
  };
  let crosspost = {
    community: '',
    body: '',
    communityTag: '',
    authorReputation: 0
  };

  if (!!permlink && !!username) {
    try {
      await queryClient.prefetchQuery(['discussionData', permlink], async () => {
        const discussion = await getDiscussion(username, permlink);
        const authorMutedList = await getFollowList(username, 'muted');
        // Strip out active_votes from all posts in discussion
        if (discussion) {
          const cleanedDiscussion: Record<string, Entry> = {};
          Object.keys(discussion).forEach((key) => {
            cleanedDiscussion[key] = {
              ...discussion[key],
              active_votes: [],
              stats: {
                flag_weight: discussion[key].stats?.flag_weight ?? 0,
                gray: authorMutedList?.some((e) => e.name === discussion[key].author)
                  ? true
                  : (discussion[key].stats?.gray ?? false),
                hide: discussion[key].stats?.hide ?? false,
                total_votes: discussion[key].stats?.total_votes ?? 0,
                is_pinned: discussion[key].stats?.is_pinned ?? false
              }
            };
          });
          return cleanedDiscussion;
        }
        return discussion;
      });

      // Get the main post from discussion data and prefetch it for client
      const discussionData = queryClient.getQueryData(['discussionData', permlink]) as Record<string, Entry>;
      if (discussionData) {
        const mainPostUrl = `@${username}/${permlink}`;
        const mainPostKey = Object.keys(discussionData).find((key) => {
          if (discussionData[key].url.endsWith(mainPostUrl)) {
            return discussionData[key];
          }
        });
        post = discussionData[mainPostKey ?? ''] as Entry;

        // Prefetch the main post data for client-side use
        if (post) {
          await queryClient.prefetchQuery(['postData', username, permlink], () => Promise.resolve(post));
        }
      }
    } catch (error) {
      console.error('Error prefetching comments data:', error);
    }
  }

  if (post) {
    mutedStatus = post.stats?.gray ?? false;
    metadata.tabTitle = `${post.title} - Hive`;
    metadata.description = (post.json_metadata?.summary || post.json_metadata?.description) ?? '';
    metadata.image =
      post.json_metadata?.image?.[0] ||
      post.json_metadata?.images?.[0] ||
      'https://hive.blog/images/hive-blog-share.png';
    metadata.title = post.title ?? '';
  }
  if (community === 'undefined' || !community) {
    return {
      redirect: {
        destination: `/${post?.community ?? post?.category}/@${username}/${permlink}`,
        permanent: true
      }
    };
  }
  if (post?.json_metadata.tags?.includes('cross-post')) {
    try {
      const fullCrossedPost = await getPost(
        post.json_metadata.original_author,
        String(post.json_metadata.original_permlink)
      );
      // Strip out active_votes from crosspost as well
      const crossedPost = fullCrossedPost
        ? {
            ...fullCrossedPost,
            active_votes: []
          }
        : fullCrossedPost;

      crosspost = {
        community: crossedPost?.community_title ?? crossedPost?.community ?? '',
        body: crossedPost?.body ?? '',
        communityTag: crossedPost?.community ?? '',
        authorReputation: crossedPost?.author_reputation ?? 0
      };
    } catch (error) {
      logger.error('Failed to fetch crosspost:', error);
    }
  }
  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      mutedStatus,
      community,
      username,
      permlink,
      metadata,
      crosspost,
      ...(await getTranslations(ctx))
    }
  };
};

export default PostPage;
