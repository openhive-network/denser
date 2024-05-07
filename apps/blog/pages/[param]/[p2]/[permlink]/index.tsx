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
import { useContext, useEffect, useRef, useState } from 'react';
import sorter, { SortOrder } from '@/blog/lib/sorter';
import { useRouter } from 'next/router';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { Icons } from '@ui/components/icons';
import { AlertDialogReblog } from '@/blog/components/alert-window';
import { ReplyTextbox } from '@/blog/components/reply-textbox';
import { SharePost } from '@/blog/components/share-post-dialog';
import LinkedInShare from '@/blog/components/share-post-linkedin';
import FacebookShare from '@/blog/components/share-post-facebook';
import RedditShare from '@/blog/components/share-post-reddit';
import TwitterShare from '@/blog/components/share-post-twitter';
import { Badge } from '@ui/components/badge';
import { Button } from '@ui/components/button';
import { Separator } from '@ui/components';
import { LeavePageDialog } from '@/blog/components/leave-page-dialog';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';
import { AlertDialogFlag } from '@/blog/components/alert-window-flag';
import VotesComponent from '@/blog/components/votes';
import { HiveRendererContext } from '@/blog/components/hive-renderer-context';
import { useLocalStorage } from 'usehooks-ts';
import PostForm from '@/blog/components/post-form';
import { useUser } from '@smart-signer/lib/auth/use-user';
import DialogLogin from '@/blog/components/dialog-login';
import { UserPopoverCard } from '@/blog/components/user-popover-card';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import dmcaList from '@/blog/lib/lists/dmcaList';
import gdprUserList from '@/blog/lib/lists/gdprUserList';
import { cn } from '@ui/lib/utils';

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
  const { data: mutedList } = useFollowListQuery(user.username, 'muted');
  const {
    isLoading: isLoadingPost,
    error: errorPost,
    data: post
  } = useQuery(['postData', username, permlink], () => getPost(username, String(permlink)), {
    enabled: !!username && !!permlink
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
  const userFromGDPR = gdprUserList.some((e) => e === post?.author);
  const defaultSort = isSortOrder(query) ? query : SortOrder.trending;
  const storageId = `replybox-/${username}/${post?.permlink}`;
  const [storedBox, storeBox, removeBox] = useLocalStorage<Boolean>(storageId, false);
  const [storedReblogs, setStoredReblogs] = useLocalStorage<string[]>(`reblogged_${user.username}`, ['']);
  const [reply, setReply] = useState<Boolean>(storedBox !== undefined ? storedBox : false);
  const firstPost = discussionState?.find((post) => post.depth === 0);
  const [edit, setEdit] = useState(false);

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

  const { hiveRenderer } = useContext(HiveRendererContext);
  const commentSite = post?.depth !== 0 ? true : false;
  const [mutedPost, setMutedPost] = useState(post?.stats?.gray);
  const postUrl = () => {
    if (discussionState) {
      const objectWithSmallestDepth = discussionState.reduce((smallestDepth, e) => {
        if (e.depth < smallestDepth.depth) {
          return e;
        }
        return smallestDepth;
      });
      return objectWithSmallestDepth.url;
    }
  };
  const parentUrl = () => {
    if (discussionState) {
      return (
        discussionState[0].category +
        '/@' +
        discussionState[0].parent_author +
        '/' +
        discussionState[0].parent_permlink
      );
    }
  };

  function findLinks(text: string) {
    const regex = /https?:\/\/[^\s]+/g;
    const matches = text.replace(/[({\[\])}]/g, ' ').match(regex) || [];

    return matches.map((match) => match);
  }

  function isImageLink(link: string) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'image'];

    return imageExtensions.some((ext) => link.includes(ext));
  }

  useEffect(() => {
    const id = router.asPath.split('#')[1];
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [router, hiveRenderer]);

  return (
    <div className="py-8">
      <div className="relative mx-auto my-0 max-w-4xl bg-white px-8 py-4 dark:bg-slate-900">
        <AlertDialogFlag community={community} username={username} permlink={permlink}>
          <Icons.flag className="absolute right-0 hover:text-red-500" />
        </AlertDialogFlag>
        {!isLoadingPost && post ? (
          <>
            {!commentSite ? (
              <h1 className="text-3xl font-bold" data-testid="article-title">
                {post.title}
              </h1>
            ) : (
              <div className="flex flex-col gap-2 bg-green-50 p-2 dark:bg-slate-950">
                <h4 className="text-sm">
                  {t('post_content.if_comment.you_are_viewing_a_single_comments_thread_from')}:
                </h4>
                <h1 data-testid="article-title" className="text-2xl">
                  {post.title}
                </h1>
                <Link
                  className="text-sm text-slate-500 hover:text-red-500"
                  href={`${postUrl()}`}
                  data-testid="view-the-full-context"
                >
                  • {t('post_content.if_comment.view_the_full_context')}
                </Link>
                {discussionState && !discussionState.some((e) => e.depth === 1) ? (
                  <Link
                    className="text-sm text-slate-500 hover:text-red-500"
                    href={`../../${parentUrl()}`}
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
            {!hiveRenderer ? (
              <Loading loading={!hiveRenderer} />
            ) : edit ? (
              <PostForm
                username={username}
                editMode={edit}
                setEditMode={setEdit}
                sideBySidePreview={false}
                post_s={post}
                refreshPage={refreshPage}
              />
            ) : mutedPost ? (
              <div id="articleBody" className="flex flex-col gap-8 py-8">
                {findLinks(post.body).map((e) =>
                  isImageLink(e) ? (
                    <Link href={e} className="text-red-500" key={e}>
                      ({t('post_content.body.Image_not_shown')})
                    </Link>
                  ) : (
                    <LeavePageDialog link={e} key={e}>
                      <Icons.externalLink className="h-4 w-4 text-slate-600" />
                    </LeavePageDialog>
                  )
                )}
              </div>
            ) : copyRightCheck ? (
              <div className="px-2 py-6">{t('post_content.body.copyright')}</div>
            ) : userFromGDPR ? (
              <div className="px-2 py-6">{t('cards.content_removed')}</div>
            ) : (
              <ImageGallery>
                <div
                  id="articleBody"
                  className="entry-body markdown-view user-selectable prose max-w-full dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: hiveRenderer.render(post.body)
                  }}
                />
              </ImageGallery>
            )}
            {mutedPost ? (
              <>
                <Separator />
                <div className="my-8 flex items-center justify-between text-red-500">
                  {t('post_content.body.images_were_hidden')}
                  <Button variant="outlineRed" onClick={() => setMutedPost(false)}>
                    {t('post_content.body.show')}
                  </Button>
                </div>
              </>
            ) : null}
            <div className="clear-both">
              {!commentSite ? (
                <ul className="flex flex-wrap gap-2" data-testid="hashtags-post">
                  {post.json_metadata?.tags?.slice(post.community_title ? 0 : 1).map((tag: string) => (
                    <li key={tag}>
                      <Link
                        href={`/trending/${tag}`}
                        className="my-2 rounded-md bg-accent px-2 py-1 text-sm text-accent-foreground hover:border-[1px] hover:border-accent-foreground"
                      >
                        #{tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="text-sm text-slate-600" data-testid="author-data-post-footer">
              <div className="my-4 flex justify-between">
                <div className="flex flex-wrap items-center">
                  <Clock />
                  <span className="px-1" title={String(parseDate(post.created))}>
                    {dateToFullRelative(post.created, t)}
                  </span>
                  {t('post_content.footer.in')}
                  <span className="px-1 text-red-600">
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
                  <UserPopoverCard
                    author={post.author}
                    author_reputation={post.author_reputation}
                    blacklist={firstPost ? firstPost.blacklists : post.blacklists}
                  />
                  {post.author_title ? (
                    <Badge variant="outline" className="border-red-600 text-slate-500">
                      {post.author_title}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center" data-testid="comment-respons-header">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertDialogReblog
                          username={post.author}
                          permlink={post.permlink}
                          setStoredReblogs={setStoredReblogs}
                        >
                          <Icons.forward
                            className={cn('h-4 w-4 cursor-pointer', {
                              'text-red-600': storedReblogs?.includes(post.permlink)
                            })}
                            data-testid="post-footer-reblog-icon"
                          />
                        </AlertDialogReblog>
                      </TooltipTrigger>
                      <TooltipContent data-test="post-footer-reblog-tooltip">
                        <p>
                          {t('post_content.footer.reblog')} @{post.author}/{post.permlink}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="mx-1">|</span>
                  {user && user.isLoggedIn ? (
                    <button
                      onClick={() => {
                        setReply(!reply), removeBox();
                      }}
                      className="flex items-center text-red-600"
                      data-testid="comment-reply"
                    >
                      {t('post_content.footer.reply')}
                    </button>
                  ) : (
                    <DialogLogin>
                      <button className="flex items-center text-red-600" data-testid="comment-reply">
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
                        className="flex items-center text-red-600"
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
                            <Icons.messagesSquare className="h-4 w-4 sm:mr-1" />
                          ) : (
                            <Icons.comment className="h-4 w-4 sm:mr-1" />
                          )}
                        </Link>
                        <Link href={post.url} className="flex cursor-pointer items-center text-red-600">
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
              </div>
              <div className="my-4 flex justify-between">
                <div className="flex items-center gap-2 sm:gap-4">
                  <VotesComponent post={post} />
                  <DetailsCardHover
                    post={post}
                    decline={Number(post.max_accepted_payout.slice(0, 1)) === 0}
                    post_page
                  >
                    <span
                      data-testid="comment-payout"
                      className={`text-xs text-red-600 hover:cursor-pointer sm:text-sm ${
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
                        <span className="text-xs text-red-500 sm:text-sm">
                          {post.stats?.total_votes > 1
                            ? t('post_content.footer.votes', { votes: post.stats?.total_votes })
                            : t('post_content.footer.vote')}
                        </span>
                      ) : null}
                    </DetailsCardVoters>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <FacebookShare url={post.url} />
                  <TwitterShare title={post.title} url={post.url} />
                  <LinkedInShare title={post.title} url={post.url} />
                  <RedditShare title={post.title} url={post.url} />
                  <SharePost path={router.asPath}>
                    <Link2 className="cursor-pointer hover:text-red-600" data-testid="share-post" />
                  </SharePost>
                </div>
              </div>
            </div>
          </>
        ) : (
          <Loading loading={isLoadingPost} />
        )}
      </div>
      <div id="comments" className="flex" />
      <div className="mx-auto my-0 max-w-4xl py-4">
        {reply && post && user.isLoggedIn ? (
          <ReplyTextbox
            editMode={edit}
            onSetReply={setReply}
            username={post.author}
            permlink={permlink}
            storageId={storageId}
          />
        ) : null}
      </div>
      {!isLoadingDiscussion && discussion && discussionState && !isLoadingPost && post ? (
        <div className="mx-auto my-0 max-w-4xl py-4 pr-8">
          <div className="flex items-center justify-end pb-4" translate="no">
            <span>{t('select_sort.sort_comments.sort')}</span>
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
      ...(await serverSideTranslations(ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale, [
        'common_blog',
        'smart-signer'
      ]))
    }
  };
};

export default PostPage;
