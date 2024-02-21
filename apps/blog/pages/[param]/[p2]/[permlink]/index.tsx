import parseDate, { dateToFullRelative } from '@hive/ui/lib/parse-date';
import { Clock, Link2 } from 'lucide-react';
import UserInfo from '@/blog/components/user-info';
import { getActiveVotes } from '@/blog/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { Entry, getCommunity, getDiscussion, getPost } from '@ui/lib/bridge';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@hive/ui/components/tooltip';
import { Icons } from '@hive/ui/components/icons';
import { AlertDialogReblog } from '@/blog/components/alert-window';
import { ReplyTextbox } from '@/blog/components/reply-textbox';
import { SharePost } from '@/blog/components/share-post-dialog';
import LinkedInShare from '@/blog/components/share-post-linkedin';
import FacebookShare from '@/blog/components/share-post-facebook';
import RedditShare from '@/blog/components/share-post-reddit';
import TwitterShare from '@/blog/components/share-post-twitter';
import { Badge } from '@hive/ui/components/badge';
import { UserHoverCard } from '@/blog/components/user-hover-card';
import { Button } from '@ui/components/button';
import { Separator } from '@ui/components';
import { LeavePageDialog } from '@/blog/components/leave-page-dialog';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';
import { GetServerSideProps } from 'next';
import { AlertDialogFlag } from '@/blog/components/alert-window-flag';
import VotesComponent from '@/blog/components/votes';
import { renderPostBody } from '@ecency/render-helper';

const DynamicComments = dynamic(() => import('@/blog/components/comment-list'), {
  loading: () => <Loading loading={true} />,
  ssr: false
});

function PostPage({
  post_s,
  community,
  username,
  permlink
}: {
  post_s: Entry;
  community: string;
  username: string;
  permlink: string;
}) {
  const { t } = useTranslation('common_blog');
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
  const defaultSort = isSortOrder(query) ? query : SortOrder.trending;

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

  function replaceLinkIdToDataId(str: string) {
    return str.replace(/<a id="/g, '<a data-id="');
  }

  const renderedBody = {
    __html: renderPostBody(replaceLinkIdToDataId(post_s.body), false)
  };

  const commentSite = post_s.depth !== 0 ? true : false;
  const [reply, setReply] = useState(false);
  const [mutedPost, setMutedPost] = useState(post_s.stats?.gray);
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

  return (
    <div className="py-8">
      <div className="relative mx-auto my-0 max-w-4xl bg-white px-8 py-4 dark:bg-slate-900">
        <AlertDialogFlag community={community} username={username} permlink={permlink}>
          <Icons.flag className="absolute right-0 hover:text-red-500" />
        </AlertDialogFlag>

        {!commentSite ? (
          <h1 className="text-3xl font-bold" data-testid="article-title">
            {post_s.title}
          </h1>
        ) : (
          <div className="flex flex-col gap-2 bg-green-50 p-2 dark:bg-slate-950">
            <h4 className="text-sm">
              {t('post_content.if_comment.you_are_viewing_a_single_comments_thread_from')}:
            </h4>
            <h1 data-testid="article-title" className="text-2xl">
              {post_s.title}
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
          author={post_s.author}
          author_reputation={post_s.author_reputation}
          author_title={post_s.author_title}
          authored={post_s.json_metadata?.author}
          community_title={communityData?.title || ''}
          community={community}
          category={post_s.category}
          created={post_s.created}
          blacklist={post_s.blacklists}
        />
        {/* <span className="text-red-600" title={post_s.blacklists[0]}>
        ({post_s.blacklists.length})
      </span> */}
        <hr />
        {!renderedBody ? (
          <Loading loading={!renderedBody} />
        ) : mutedPost ? (
          <div id="articleBody" className="flex flex-col gap-8 py-8">
            {findLinks(post_s.body).map((e) =>
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
        ) : (
          <ImageGallery>
            <div
              id="articleBody"
              className="entry-body markdown-view user-selectable prose max-w-full dark:prose-invert"
              dangerouslySetInnerHTML={renderedBody}
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
              {post_s.json_metadata?.tags?.map((tag: string) => (
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
              <span className="px-1" title={String(parseDate(post_s.created))}>
                {dateToFullRelative(post_s.created, t)}
              </span>
              {t('post_content.footer.in')}
              <span className="px-1 text-red-600">
                {post_s.community_title ? (
                  <Link
                    href={`/trending/${community}`}
                    className="hover:cursor-pointer"
                    data-testid="footer-comment-community-category-link"
                  >
                    {post_s.community_title}
                  </Link>
                ) : (
                  <Link
                    href={`/trending/${post_s.category}`}
                    className="hover:cursor-pointer"
                    data-testid="footer-comment-community-category-link"
                  >
                    #{post_s.category}
                  </Link>
                )}
              </span>
              {t('post_content.footer.by')}
              <UserHoverCard
                author={post_s.author}
                author_reputation={post_s.author_reputation}
                blacklist={post_s.blacklists}
              />
              {post_s.author_title ? (
                <Badge variant="outline" className="border-red-600 text-slate-500">
                  {post_s.author_title}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center" data-testid="comment-respons-header">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertDialogReblog username={post_s.author} permlink={post_s.permlink}>
                      <Icons.forward
                        className="h-4 w-4 cursor-pointer"
                        data-testid="post-footer-reblog-icon"
                      />
                    </AlertDialogReblog>
                  </TooltipTrigger>
                  <TooltipContent data-test="post-footer-reblog-tooltip">
                    <p>
                      {t('post_content.footer.reblog')} @{post_s.author}/{post_s.permlink}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="mx-1">|</span>
              <button
                onClick={() => setReply(!reply)}
                className="flex items-center text-red-600"
                data-testid="comment-reply"
              >
                {t('post_content.footer.reply')}
              </button>
              <span className="mx-1">|</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center" data-testid="comment-respons">
                    <Link href={post_s.url} className="flex cursor-pointer items-center">
                      {post_s.children > 1 ? (
                        <Icons.messagesSquare className="h-4 w-4 sm:mr-1" />
                      ) : (
                        <Icons.comment className="h-4 w-4 sm:mr-1" />
                      )}
                    </Link>
                    <Link href={post_s.url} className="flex cursor-pointer items-center text-red-600">
                      {post_s.children}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent data-testid="post-footer-response-tooltip">
                    <p>
                      {post_s.children === 0
                        ? t('post_content.footer.no_response')
                        : post_s.children === 1
                        ? t('post_content.footer.response')
                        : t('post_content.footer.responses', { responses: post_s.children })}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="my-4 flex justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <VotesComponent post={post_s} />
              <DetailsCardHover
                post={post_s}
                decline={Number(post_s.max_accepted_payout.slice(0, 1)) === 0}
                post_page
              >
                <span
                  data-testid="comment-payout"
                  className={`text-xs text-red-600 hover:cursor-pointer sm:text-sm ${
                    Number(post_s.max_accepted_payout.slice(0, 1)) === 0 ? '!text-gray-600 line-through' : ''
                  }`}
                >
                  ${post_s.payout?.toFixed(2)}
                </span>
              </DetailsCardHover>
              {!isActiveVotesLoading && activeVotesData ? (
                <DetailsCardVoters post={post_s}>
                  {post_s.stats?.total_votes && post_s.stats?.total_votes !== 0 ? (
                    <span className="text-xs text-red-500 sm:text-sm">
                      {post_s.stats?.total_votes > 1
                        ? t('post_content.footer.votes', { votes: post_s.stats?.total_votes })
                        : t('post_content.footer.vote')}
                    </span>
                  ) : null}
                </DetailsCardVoters>
              ) : null}
            </div>
            <div className="flex gap-2">
              <FacebookShare url={post_s.url} />
              <TwitterShare title={post_s.title} url={post_s.url} />
              <LinkedInShare title={post_s.title} url={post_s.url} />
              <RedditShare title={post_s.title} url={post_s.url} />
              <SharePost path={router.asPath}>
                <Link2 className="cursor-pointer hover:text-red-600" data-testid="share-post" />
              </SharePost>
            </div>
          </div>
        </div>
      </div>
      <div id="comments" className="flex" />
      <div className="mx-auto my-0 max-w-4xl py-4">
        {reply ? <ReplyTextbox onSetReply={setReply} username={username} permlink={permlink} /> : null}
      </div>
      {!isLoadingDiscussion && discussion && discussionState ? (
        <div className="mx-auto my-0 max-w-4xl py-4 pr-8">
          <div className="flex items-center justify-end pb-4" translate="no">
            <span>{t('select_sort.sort_comments.sort')}</span>
            <CommentSelectFilter />
          </div>
          <DynamicComments data={discussionState} parent={post_s} parent_depth={post_s.depth} />
        </div>
      ) : (
        <Loading loading={isLoadingDiscussion} />
      )}
    </div>
  );
}

//[0,1]
/*{
  '0':0,
  "1":1,
  "length:2,
  ...
}*/

export const getServerSideProps: GetServerSideProps = async ({ req, query }) => {
  const community = String(query.param);
  const username = String(query.p2).slice(1);
  const permlink = String(query.permlink);

  const post_s = await getPost(username, String(permlink));

  return {
    props: {
      post_s,
      community,
      username,
      permlink,
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, [
        'common_blog',
        'smart-signer'
      ]))
    }
  };
};

export default PostPage;
