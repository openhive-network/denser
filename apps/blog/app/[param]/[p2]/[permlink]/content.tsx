'use client';

import BasePathLink from '@/blog/components/base-path-link';
import DialogLogin from '@/blog/components/dialog-login';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { usePinMutation, useUnpinMutation } from '@/blog/components/hooks/use-pin-mutations';
import NoDataError from '@/blog/components/no-data-error';
import ChangeTitleDialog from '@/blog/features/community-profile/change-title-dialog';
import DetailsCardHover from '@/blog/features/list-of-posts/details-card-hover';
import ReblogTrigger from '@/blog/features/list-of-posts/reblog-trigger';
import { useDeletePostMutation } from '@/blog/features/post-editor/hooks/use-post-mutation';
import { postClassName } from '@/blog/features/post-editor/lib/utils';
import PostForm from '@/blog/features/post-editor/post-form';
import PostingLoader from '@/blog/features/post-editor/posting-loader';
import { ReplyTextbox } from '@/blog/features/post-editor/reply-textbox';
import { AlertDialogFlag } from '@/blog/features/post-rendering/alert-window-flag';
import CommentList from '@/blog/features/post-rendering/comment-list';
import CommentSelectFilter from '@/blog/features/post-rendering/comment-select-filter';
import ContextLinks from '@/blog/features/post-rendering/context-links';
import DetailsCardVoters from '@/blog/features/post-rendering/details-card-voters';
import FlagIcon from '@/blog/features/post-rendering/flag-icon';
import ImageGallery from '@/blog/features/post-rendering/image-gallery';
import MutePostDialog from '@/blog/features/post-rendering/mute-post-dialog';
import { PostDeleteDialog } from '@/blog/features/post-rendering/post-delete-dialog';
import RendererContainer from '@/blog/features/post-rendering/rendererContainer';
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
import sorter, { SortOrder } from '@/blog/lib/sorter';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { getBasePath } from '@/blog/utils/PathUtils';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useQuery } from '@tanstack/react-query';
import { getCommunity, getDiscussion, getListCommunityRoles, getPost } from '@transaction/lib/bridge-api';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { getActiveVotes } from '@transaction/lib/hive-api';
import { getSimilarPostsByPost, isPostStub } from '@transaction/lib/hivesense-api';
import { Badge } from '@ui/components/badge';
import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import Loading from '@ui/components/loading';
import { Separator } from '@ui/components/separator';
import TimeAgo from '@ui/components/time-ago';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import dmcaList from '@ui/config/lists/dmca-list';
import dmcaUserList from '@ui/config/lists/dmca-user-list';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import { handleError } from '@ui/lib/handle-error';
import parseDate from '@ui/lib/parse-date';
import clsx from 'clsx';
import { Clock, Link2 } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { notFound, useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CircleSpinner } from 'react-spinners-kit';
import { useLocalStorage } from 'usehooks-ts';
import dynamic from 'next/dynamic';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const VotesComponent = dynamic(() => import('@/blog/features/votes/votes-component'), {
  ssr: false
});

const PostContent = () => {
  const searchParams = useSearchParams();
  const params = useParams<{ param: string; p2: string; permlink: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const commentSort = searchParams?.get('sort') || 'trending';
  const author = params?.p2.replace('%40', '') ?? '';
  const category = params?.param ?? '';
  const permlink = params?.permlink ?? '';
  const { user } = useUserClient();
  const storageId = `replybox-/${author}/${permlink}-${user.username}`;

  const { t } = useTranslation('common_blog');
  const [storedBox, storeBox, removeBox] = useLocalStorage<Boolean>(storageId, false);
  const [storedComment] = useLocalStorage<string>(`replyTo-/${author}/${permlink}-${user.username}`, '');

  const [reply, setReply] = useState<Boolean>(storedBox !== undefined ? storedBox : false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [edit, setEdit] = useState(false);
  const observer = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const postInCommunity = category?.startsWith('hive-');
  const { data: postData, isLoading: postIsLoading } = useQuery({
    queryKey: ['postData', author, permlink],
    queryFn: () => getPost(author, permlink, observer),
    enabled: !!author && !!permlink
  });
  const [mutedPost, setMutedPost] = useState<boolean>(postData?.stats?.gray || false);
  const userFromGDPR = gdprUserList.some((e) => e === postData?.author);

  const crossedPost = postData?.json_metadata.tags?.includes('cross-post');
  const legalBlockedUser = userIllegalContent.some((e) => e === postData?.author);
  const copyRightCheck = dmcaList.includes(pathname ?? '');
  const { data: crossPostData } = useQuery({
    queryKey: [
      'postData',
      postData?.json_metadata.original_author,
      postData?.json_metadata.original_permlink
    ],
    queryFn: () =>
      getPost(postData?.json_metadata.original_author, postData?.json_metadata.original_permlink, observer),
    enabled: crossedPost
  });

  const { data: suggestionData } = useQuery({
    queryKey: ['suggestions', author, permlink],
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
  const { data: communityData } = useQuery({
    queryKey: ['community', category],
    queryFn: () => getCommunity(category, observer),
    enabled: postInCommunity
  });

  const { data: discussionData, isLoading: discussionIsLoading } = useQuery({
    queryKey: ['discussionData', permlink],
    queryFn: () => getDiscussion(author, permlink, observer)
  });
  const discussionState = useMemo(() => {
    if (!discussionData) return undefined;
    const list = [...Object.keys(discussionData).map((key) => discussionData[key])];
    const sortType = commentSort as SortOrder;
    sorter(list, sortType);
    return list;
  }, [discussionData, commentSort]);
  const firstPost = discussionState?.find((post) => post.depth === 0);
  const post_is_pinned = firstPost?.stats?.is_pinned ?? false;

  const thisPost = discussionState?.find((post) => post.permlink === permlink && postData?.author === author);
  const commentSite = thisPost?.depth !== 0 ? true : false;
  const userFromDMCA = dmcaUserList.some((e) => e === postData?.author);

  const { data: userCanModerate } = useQuery({
    queryKey: ['rolesList', category],
    queryFn: () => getListCommunityRoles(category),
    enabled: postInCommunity,
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
    queryFn: () => getActiveVotes(author, permlink)
  });

  const { data: mutedList } = useFollowListQuery(user.username, 'muted');

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
      if (!!basepath) {
        window.location.href = `${basepath}/@${author}/posts`;
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

  useEffect(() => {
    if (reply) {
      storeBox(reply);
    }
  }, [reply, storeBox]);
  if (userFromGDPR || (!postData && !postIsLoading)) return <NoDataError />;
  if (!postData) return notFound();
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12">
        <div className="col-span-2 hidden md:block">
          {suggestionData ? <AnimatedList suggestions={suggestionData} /> : null}
        </div>
        <div className="py-8 sm:col-span-8 sm:mx-auto sm:flex sm:flex-col">
          <div className="relative mx-auto my-0 max-w-4xl bg-background p-4">
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
            <div className="absolute right-0 top-1 cursor-pointer hover:text-destructive">
              {postInCommunity && !user.isLoggedIn ? (
                <DialogLogin>
                  <FlagIcon onClick={() => {}} />
                </DialogLogin>
              ) : communityData && user.isLoggedIn ? (
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

            {postData ? (
              <div>
                {!commentSite ? (
                  <h1
                    className="font-sanspro text-[21px] font-extrabold sm:text-[25.6px]"
                    data-testid="article-title"
                  >
                    {postData.title}
                  </h1>
                ) : (
                  <ContextLinks
                    data={postData}
                    noContext={!!discussionState && !discussionState.some((e) => e.depth === 1)}
                  />
                )}
                <UserInfo
                  permlink={permlink}
                  moderateEnabled={!!userCanModerate}
                  author={postData.author}
                  author_reputation={
                    crossPostData ? crossPostData.author_reputation : postData.author_reputation
                  }
                  author_title={postData.author_title}
                  authored={postData.json_metadata?.author}
                  community_title={
                    crossPostData?.community ? crossPostData.community : communityData?.title || ''
                  }
                  community={crossPostData?.community ? crossPostData.community : category}
                  category={postData.category}
                  created={postData.created}
                  blacklist={
                    firstPost ? firstPost.blacklists : thisPost ? thisPost.blacklists : postData.blacklists
                  }
                />
                {postIsLoading ? (
                  <Loading loading={postIsLoading} />
                ) : edit && commentSite && postData.parent_author && postData.parent_permlink ? (
                  <ReplyTextbox
                    editMode={edit}
                    onSetReply={setEdit}
                    username={postData.parent_author}
                    permlink={postData.permlink}
                    parentPermlink={postData.parent_permlink}
                    storageId={storageId}
                    comment={postData}
                    discussionPermlink={permlink}
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
                      mainPost={postData.depth === 0}
                      body={crossPostData?.body ?? postData.body}
                      author={postData.author}
                      className={postClassName}
                    />
                  </ImageGallery>
                )}
                <div className="clear-both">
                  {!commentSite ? (
                    <ul className="flex flex-wrap gap-2" data-testid="hashtags-post">
                      {postData.json_metadata.tags
                        ?.filter((e) => e !== postData.category && e !== '' && e !== postData.community)
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
                      <span className="px-1" title={String(parseDate(postData.created))}>
                        <TimeAgo date={postData.created} />
                      </span>
                      {t('post_content.footer.in')}
                      <span className="px-1 text-destructive">
                        {postData.community_title ? (
                          <Link
                            href={`/trending/${crossPostData?.community ?? postData.community}`}
                            className="hover:cursor-pointer"
                            data-testid="footer-comment-community-category-link"
                          >
                            {crossPostData?.community ?? postData.community_title}
                          </Link>
                        ) : (
                          <Link
                            href={`/trending/${postData.category}`}
                            className="hover:cursor-pointer"
                            data-testid="footer-comment-community-category-link"
                          >
                            #{postData.category}
                          </Link>
                        )}
                      </span>
                      {t('post_content.footer.by')}
                      <div className="flex">
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
                          <Badge variant="outline" className="border-destructive text-slate-500">
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
                    <div className="flex items-center gap-2 sm:gap-4">
                      <VotesComponent post={postData} type="post" />
                      <DetailsCardHover
                        post={postData}
                        decline={Number(postData.max_accepted_payout.slice(0, 1)) === 0}
                        post_page
                      >
                        <span
                          data-testid="comment-payout"
                          className={`text-xs text-destructive hover:cursor-pointer sm:text-sm ${
                            Number(postData.max_accepted_payout.slice(0, 1)) === 0
                              ? '!text-gray-600 line-through'
                              : ''
                          }`}
                        >
                          ${postData.payout?.toFixed(2)}
                        </span>
                      </DetailsCardHover>
                      {activeVotesData ? (
                        <DetailsCardVoters post={postData}>
                          {!!postData.stats?.total_votes && postData.stats?.total_votes !== 0 ? (
                            <span className="text-xs text-destructive sm:text-sm">
                              {postData.stats?.total_votes > 1
                                ? t('post_content.footer.votes', { votes: postData.stats?.total_votes })
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
                        author={postData.author}
                        permlink={postData.permlink}
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
                      moment().format('YYYY-MM-DDTHH:mm:ss') < postData.payout_at ? (
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
                      <span className="mx-1">|</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center" data-testid="comment-respons">
                            <Link href={postData.url} className="flex cursor-pointer items-center">
                              {postData.children > 1 ? (
                                <Icons.messagesSquare className="mr-1 h-4 w-4" />
                              ) : (
                                <Icons.comment className="mr-1 h-4 w-4" />
                              )}
                            </Link>
                            <Link href={postData.url} className="text- flex cursor-pointer items-center">
                              {postData.children}
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
                    <div className="flex items-center gap-2">
                      <FacebookShare url={postData.url} />
                      <TwitterShare title={postData.title} url={postData.url} />
                      <LinkedInShare title={postData.title} url={postData.url} />
                      <RedditShare title={postData.title} url={postData.url} />
                      <SharePost path={postData.url} title={postData.title}>
                        <Link2 className="cursor-pointer hover:text-destructive" data-testid="share-post" />
                      </SharePost>
                    </div>
                  </div>
                </div>
                {crossedPost ? (
                  <div className="mb-12 flex w-full justify-center">
                    <Link
                      href={`/@${postData.json_metadata.original_author}/${postData.json_metadata.original_permlink}`}
                    >
                      <Button variant="redHover">{`Browse to the original post by @${postData.json_metadata.original_author}`}</Button>
                    </Link>
                  </div>
                ) : null}
                <div className="col-span-2 md:hidden">
                  {!!suggestionData ? (
                    <div className="flex flex-col overflow-x-auto md:sticky md:top-24 md:max-h-[calc(100vh-96px)]">
                      <h2 className="mb-4 mt-2 px-4 font-sanspro text-xl font-bold md:mt-0">
                        You Might Also Like
                      </h2>
                      <SuggestionsList suggestions={suggestionData} />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <Loading loading={postIsLoading} />
            )}
          </div>
          <div id="comments" className="flex" />
          <div>
            {reply && postData && user.isLoggedIn ? (
              <ReplyTextbox
                editMode={edit}
                onSetReply={setReply}
                username={postData.author}
                permlink={permlink}
                storageId={storageId}
                comment={storedComment}
                discussionPermlink={permlink}
              />
            ) : null}
          </div>
          {!!discussionData && !!discussionState && !!postData ? (
            <div className="max-w-4xl pr-2">
              <div className="my-1 flex items-center justify-end" translate="no">
                <span className="pr-1">{t('select_sort.sort_comments.sort')}</span>
                <CommentSelectFilter />
              </div>
              <CommentList
                highestAuthor={postData.author}
                highestPermlink={postData.permlink}
                permissionToMute={!!userCanModerate}
                mutedList={mutedList || []}
                data={discussionState}
                flagText={communityData?.flag_text}
                parent={postData}
                parent_depth={postData.depth}
                discussionPermlink={permlink}
              />
            </div>
          ) : (
            <Loading loading={discussionIsLoading} />
          )}
        </div>
        <div className="col-span-2" />
      </div>
      <PostingLoader isSubmitting={isSubmitting} />
    </>
  );
};
export default PostContent;
