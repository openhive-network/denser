import parseDate, { dateToFullRelative } from '@ui/lib/parse-date';
import { Clock, Link2 } from 'lucide-react';
import UserInfo from '@/blog/components/user-info';
import { getActiveVotes } from '@transaction/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { Entry, getCommunity, getDiscussion, getPost } from '@transaction/lib/bridge';
import Loading from '@hive/ui/components/loading';
import dynamic from 'next/dynamic';
import ImageGallery from '@/blog/components/image-gallery';
import Link from 'next/link';
import DetailsCardHover from '@/blog/components/details-card-hover';
import DetailsCardVoters from '@/blog/components/details-card-voters';
import CommentSelectFilter from '@/blog/components/comment-select-filter';
import { useEffect, useState } from 'react';
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
import PostForm from '@/blog/components/post-form';
import { useUser } from '@smart-signer/lib/auth/use-user';
import DialogLogin from '@/blog/components/dialog-login';
import { UserPopoverCard } from '@/blog/components/user-popover-card';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import dmcaUserList from '@ui/config/lists/dmca-user-list';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import dmcaList from '@ui/config/lists/dmca-list';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import CustomError from '@/blog/components/custom-error';
import RendererContainer from '@/blog/components/rendererContainer';
import { getLogger } from '@ui/lib/logging';
import ReblogTrigger from '@/blog/components/reblog-trigger';
import { getTranslations } from '@/blog/lib/get-translations';
import Head from 'next/head';
import env from '@beam-australia/react-env';

const logger = getLogger('app');

const DynamicComments = dynamic(() => import('@/blog/components/comment-list'), {
  loading: () => <Loading loading={true} />,
  ssr: false
});

function PostPage({
  community,
  username,
  permlink
}: {
  community: string;
  username: string;
  permlink: string;
}) {
  const { t } = useTranslation('common_blog');
  const { user } = useUser();

  const {
    isLoading: isLoadingFollowList,
    error: errorFollowList,
    data: mutedList
  } = useFollowListQuery(user.username, 'muted');

  const {
    isLoading: isLoadingPost,
    error: errorPost,
    data: post
  } = useQuery(['postData', username, permlink], () => getPost(username, String(permlink)), {
    enabled: !!username && !!permlink,
    onSuccess: (post) => setMutedPost(!!post?.stats?.gray)
  });

  const {
    isLoading: isLoadingDiscussion,
    error: errorDiscussion,
    data: discussion
  } = useQuery(['discussionData', username, permlink], () => getDiscussion(username, String(permlink)), {
    enabled: !!username && !!permlink
  });

  const {
    isLoading: isLoadingCommunity,
    error: errorCommunity,
    data: communityData
  } = useQuery(['communityData', community], () => getCommunity(community), {
    enabled: !!username && !!community && community.startsWith('hive-')
  });

  const {
    data: activeVotesData,
    isLoading: isActiveVotesLoading,
    isError: activeVotesError
  } = useQuery(['activeVotes'], () => getActiveVotes(username, permlink), {
    enabled: !!username && !!permlink
  });

  const [discussionState, setDiscussionState] = useState<Entry[]>();
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
  const storageId = `replybox-/${username}/${post?.permlink}`;
  const [storedBox, storeBox, removeBox] = useLocalStorage<Boolean>(storageId, false);
  const [storedComment, storeCommment, removeCommment] = useLocalStorage<string>(
    `replyTo-/${username}/${permlink}`,
    ''
  );
  const [reply, setReply] = useState<Boolean>(storedBox !== undefined ? storedBox : false);
  const firstPost = discussionState?.find((post) => post.depth === 0);
  const [edit, setEdit] = useState(false);

  const userFromGDPR = gdprUserList.some((e) => e === post?.author);
  const refreshPage = () => {
    router.replace(router.asPath);
  };

  useEffect(() => {
    if (reply) {
      storeBox(reply);
    }
  }, [reply, storeBox]);
  useEffect(() => {
    if (discussion) {
      const list = [...Object.keys(discussion).map((key) => discussion[key])];
      sorter(list, SortOrder[defaultSort]);
      setDiscussionState(list);
    }
  }, [isLoadingDiscussion, discussion, defaultSort]);

  useEffect(() => {
    if (router.query.sort === 'trending' && discussion) {
      const list = [...Object.keys(discussion).map((key) => discussion[key])];
      sorter(list, SortOrder[router.query.sort]);
      setDiscussionState(list);
    }
    if (router.query.sort === 'votes' && discussion) {
      const list = [...Object.keys(discussion).map((key) => discussion[key])];
      sorter(list, SortOrder[router.query.sort]);
      setDiscussionState(list);
    }
    if (router.query.sort === 'new' && discussion) {
      const list = [...Object.keys(discussion).map((key) => discussion[key])];
      sorter(list, SortOrder[router.query.sort]);
      setDiscussionState(list);
    }
  }, [discussion, router.query.sort]);

  const commentSite = post?.depth !== 0 ? true : false;
  const [mutedPost, setMutedPost] = useState<boolean | undefined>(undefined);
  const generateUrls = () => {
    if (!discussionState || discussionState.length === 0) return null;

    const highest_item = discussionState.reduce(
      (smallest, current) => (current.depth < smallest.depth ? current : smallest),
      discussionState[0]
    );

    const postUrl = highest_item.url.startsWith('/') ? highest_item.url : `/${highest_item.url}`;
    const parentUrl = `${highest_item.category}/@${highest_item.parent_author}/${highest_item.parent_permlink}`;

    return { postUrl, parentUrl };
  };
  const { postUrl, parentUrl } = generateUrls() || {};
  if (userFromGDPR) {
    return <CustomError />;
  }

  const canonical_url = post ? new URL(post.url, env('SITE_DOMAIN')).href : undefined;

  return (
    <>
      <Head>{canonical_url ? <link rel="canonical" href={canonical_url} key="canonical" /> : null}</Head>
      <div className="py-8">
        <div className="relative mx-auto my-0 max-w-4xl bg-background px-8 py-4">
          {communityData ? (
            <AlertDialogFlag
              community={community}
              username={username}
              permlink={permlink}
              flagText={communityData.flag_text}
            >
              <Icons.flag className="absolute right-0 m-2 hover:text-destructive" />
            </AlertDialogFlag>
          ) : null}
          {!isLoadingPost && post ? (
            <div>
              {!commentSite ? (
                <h1 className="text-3xl font-bold" data-testid="article-title">
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
                    href={`${postUrl}`}
                    data-testid="view-the-full-context"
                  >
                    • {t('post_content.if_comment.view_the_full_context')}
                  </Link>
                  {discussionState && !discussionState.some((e) => e.depth === 1) ? (
                    <Link
                      className="text-sm hover:text-destructive"
                      href={`../../${parentUrl}`}
                      data-testid="view-the-direct-parent"
                    >
                      • {t('post_content.if_comment.view_the_direct_parent')}
                    </Link>
                  ) : null}
                </div>
              )}
              <UserInfo
                author={post.author}
                author_reputation={post.author_reputation}
                author_title={post.author_title}
                authored={post.json_metadata?.author}
                community_title={communityData?.title || ''}
                community={community}
                category={post.category}
                created={post.created}
                blacklist={firstPost ? firstPost.blacklists : post.blacklists}
              />

              <hr />

              {mutedPost === undefined || isLoadingPost ? (
                <Loading loading={mutedPost === undefined || isLoadingPost} />
              ) : edit ? (
                <PostForm
                  username={username}
                  editMode={edit}
                  setEditMode={setEdit}
                  sideBySidePreview={false}
                  post_s={post}
                  refreshPage={refreshPage}
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
                    body={post.body}
                    className="entry-body markdown-view user-selectable prose max-w-full py-4 dark:prose-invert"
                    author={post.author}
                  />
                </ImageGallery>
              )}

              <div className="clear-both">
                {!commentSite ? (
                  <ul className="flex flex-wrap gap-2" data-testid="hashtags-post">
                    {post.json_metadata?.tags?.slice(post.community_title ? 0 : 1).map((tag: string) => (
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
                      {dateToFullRelative(post.created, t)}
                    </span>
                    {t('post_content.footer.in')}
                    <span className="px-1 text-destructive">
                      {post.community_title ? (
                        <Link
                          href={`/trending/${community}`}
                          className="hover:cursor-pointer"
                          data-testid="footer-comment-community-category-link"
                        >
                          {post.community_title}
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
                        author={post.author}
                        author_reputation={post.author_reputation}
                        blacklist={firstPost ? firstPost.blacklists : post.blacklists}
                      />
                      {post.author_title ? (
                        <Badge variant="outline" className="border-destructive text-slate-500">
                          {post.author_title}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <VotesComponent post={post} />
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
                      <button
                        onClick={() => {
                          setReply(!reply), removeBox();
                        }}
                        className="flex items-center text-destructive"
                        data-testid="comment-reply"
                      >
                        {t('post_content.footer.reply')}
                      </button>
                    ) : (
                      <DialogLogin>
                        <button className="flex items-center text-destructive" data-testid="comment-reply">
                          {t('post_content.footer.reply')}
                        </button>
                      </DialogLogin>
                    )}
                    {user && user.isLoggedIn && post.author === user.username ? (
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
                  <div className="flex gap-2">
                    <FacebookShare url={post.url} />
                    <TwitterShare title={post.title} url={post.url} />
                    <LinkedInShare title={post.title} url={post.url} />
                    <RedditShare title={post.title} url={post.url} />
                    <SharePost path={router.asPath}>
                      <Link2 className="cursor-pointer hover:text-destructive" data-testid="share-post" />
                    </SharePost>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Loading loading={isLoadingPost} />
          )}
        </div>
        <div id="comments" className="flex" />
        <div className="mx-auto max-w-4xl">
          {reply && post && user.isLoggedIn ? (
            <ReplyTextbox
              editMode={edit}
              onSetReply={setReply}
              username={post.author}
              permlink={permlink}
              storageId={storageId}
              comment={storedComment}
            />
          ) : null}
        </div>
        {!isLoadingDiscussion && discussion && discussionState && !isLoadingPost && post ? (
          <div className="mx-auto max-w-4xl pr-2">
            <div className="my-1 flex items-center justify-end" translate="no">
              <span className="pr-1">{t('select_sort.sort_comments.sort')}</span>
              <CommentSelectFilter />
            </div>
            <DynamicComments
              mutedList={mutedList || []}
              data={discussionState}
              parent={post}
              parent_depth={post.depth}
            />
          </div>
        ) : (
          <Loading loading={isLoadingDiscussion} />
        )}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const community = String(ctx.query.param);
  const username = String(ctx.query.p2).slice(1);
  const permlink = String(ctx.query.permlink);

  const queryClient = new QueryClient();
  if (!queryClient.getQueryData(['postData', username, permlink])) {
    await queryClient.prefetchQuery(['postData', username, permlink], () =>
      getPost(username, String(permlink))
    );
  }

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      community,
      username,
      permlink,
      ...(await getTranslations(ctx))
    }
  };
};

export default PostPage;
