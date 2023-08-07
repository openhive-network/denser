import parseDate, { dateToRelative } from '@hive/ui/lib/parse-date';
import { Clock, Link2 } from 'lucide-react';
import UserInfo from '@/blog/components/user-info';
import { getActiveVotes } from '@/blog/lib/hive';
import { getFeedHistory } from '@hive/ui/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { Entry, getCommunity, getDiscussion, getPost } from '@/blog/lib/bridge';
import Loading from '@hive/ui/components/loading';
import dynamic from 'next/dynamic';
import ImageGallery from '@/blog/components/image-gallery';
import Link from 'next/link';
import { NextPageContext } from 'next';
import DetailsCardHover from '@/blog/components/details-card-hover';
import DetailsCardVoters from '@/blog/components/details-card-voters';
import CommentSelectFilter from '@/blog/components/comment-select-filter';
import { useEffect, useState } from 'react';
import sorter, { SortOrder } from '@/blog/lib/sorter';
import { useRouter } from 'next/router';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@hive/ui/components/tooltip';
import DialogLogin from '@/blog/components/dialog-login';
import { Icons } from '@hive/ui/components/icons';
import { AlertDialogDemo } from '@/blog/components/alert-window';
import { getDoubleSize, proxifyImageUrl } from '@/blog/lib/old-profixy';
import { ReplyTextbox } from '@/blog/components/reply-textbox';
import { SharePost } from '@/blog/components/share-post-dialog';
import LinkedInShare from '@/blog/components/share-post-linkedin';
import { convertStringToBig } from '@hive/ui/lib/helpers';
import FacebookShare from '@/blog/components/share-post-facebook';
import RedditShare from '@/blog/components/share-post-reddit';
import TwitterShare from '@/blog/components/share-post-twitter';
import { Badge } from '@hive/ui/components/badge';
import { UserHoverCard } from '@/blog/components/user-hover-card';

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
    data: historyFeedData,
    isLoading: isHistoryFeedLoading,
    isError: historyFeedError
  } = useQuery(['feedHistory'], () => getFeedHistory());
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
  }, [isLoadingDiscussion, discussion]);

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
  }, [router.query.sort]);

  const renderer = new DefaultRenderer({
    baseUrl: 'https://hive.blog/',
    breaks: true,
    skipSanitization: false,
    allowInsecureScriptTags: false,
    addNofollowToLinks: true,
    addTargetBlankToLinks: true,
    addCssClassToLinks: 'external-link',
    doNotShowImages: false,
    ipfsPrefix: '',
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url: string) => getDoubleSize(proxifyImageUrl(url, true).replace(/ /g, '%20')),
    usertagUrlFn: (account: string) => '/@' + account,
    hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
    isLinkSafeFn: (url: string) => false
  });
  const post_html = renderer.render(post_s.body);
  const commentSite = post_s.depth !== 0 ? true : false;
  const [reply, setReply] = useState(false);
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
  if (isHistoryFeedLoading || !historyFeedData) {
    return <Loading loading={isHistoryFeedLoading} />;
  }
  const historyFeedArr = historyFeedData?.price_history;
  const price_per_hive = convertStringToBig(historyFeedArr[historyFeedArr.length - 1].base);
  return (
    <div className="py-8">
      <div className="mx-auto my-0 max-w-4xl bg-white px-8 py-4 dark:bg-slate-900">
        {!commentSite ? (
          <h1 className="text-3xl font-bold" data-testid="article-title">
            {post_s.title}
          </h1>
        ) : (
          <div className="flex flex-col gap-2 bg-green-50 p-2 dark:bg-slate-950">
            <h4 className="text-sm">You are viewing a single comment&apos;s thread from:</h4>
            <h1 data-testid="article-title" className="text-2xl">
              {post_s.title}
            </h1>
            <Link
              className="text-sm text-slate-500 hover:text-red-500"
              href={`${postUrl()}`}
              data-testid="view-the-full-context"
            >
              • View the full context
            </Link>
            {discussionState && !discussionState.some((e) => e.depth === 1) ? (
              <Link
                className="text-sm text-slate-500 hover:text-red-500"
                href={`../../${parentUrl()}`}
                data-testid="view-the-direct-parent"
              >
                • View the direct parent
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
        />
        <hr />
        {post_html ? (
          <ImageGallery>
            <div
              id="articleBody"
              className="entry-body markdown-view user-selectable prose max-w-full dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: post_html
              }}
            />
          </ImageGallery>
        ) : (
          <Loading loading={!post_html} />
        )}

        <div className="clear-both">
          {!commentSite ? (
            <ul className="flex flex-wrap gap-2">
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
            <div className="flex flex-wrap">
              <Clock />
              <span className="px-1" title={String(parseDate(post_s.created))}>
                {dateToRelative(post_s.created)} ago
              </span>
              in
              <span className="px-1 text-red-600">
                {post_s.community_title ? (
                  <Link
                    href={`/trending/${community}`}
                    className="hover:cursor-pointer"
                    data-testid="footer-comment-community-link"
                  >
                    {post_s.community_title}
                  </Link>
                ) : (
                  <Link
                    href={`/trending/${post_s.category}`}
                    className="hover:cursor-pointer"
                    data-testid="footer-comment-category-link"
                  >
                    #{post_s.category}
                  </Link>
                )}
              </span>
              by
              <UserHoverCard author={post_s.author} author_reputation={post_s.author_reputation} />
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
                    <AlertDialogDemo>
                      <Icons.forward className="h-4 w-4 cursor-pointer" />
                    </AlertDialogDemo>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Reblog @{post_s.author}/{post_s.permlink}
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
                Reply
              </button>
              <span className="mx-1">|</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="flex items-center" data-testid="comment-respons">
                    <Link href={post_s.url} className="flex cursor-pointer items-center">
                      <Icons.comment className="h-4 w-4 sm:mr-1" />
                    </Link>
                    <Link href={post_s.url} className="flex cursor-pointer items-center text-red-600">
                      {post_s.children}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {post_s.children === 0
                        ? 'No responses'
                        : post_s.children === 1
                        ? post_s.children + ' response'
                        : post_s.children + ' responses'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="my-4 flex justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1" data-testid="comment-vote-buttons">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <DialogLogin>
                        <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white" />
                      </DialogLogin>
                    </TooltipTrigger>
                    <TooltipContent>Upvote</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <DialogLogin>
                        <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white" />
                      </DialogLogin>
                    </TooltipTrigger>
                    <TooltipContent>Downvote</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <DetailsCardHover
                post={post_s}
                price_per_hive={price_per_hive}
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
                  <span className="text-xs text-red-500 sm:text-sm">
                    {post_s.stats?.total_votes}
                    {post_s.stats?.total_votes && post_s.stats?.total_votes > 1 ? ' votes' : ' vote'}
                  </span>
                </DetailsCardVoters>
              ) : null}
            </div>
            <div className="flex gap-2">
              <FacebookShare url={post_s.url} />
              <TwitterShare title={post_s.title} url={post_s.url} />
              <LinkedInShare title={post_s.title} url={post_s.url} />
              <RedditShare title={post_s.title} url={post_s.url} />
              <SharePost path={router.asPath}>
                <Link2 className="cursor-pointer hover:text-red-600" />
              </SharePost>
            </div>
          </div>
        </div>
      </div>
      <div id="comments" className="flex" />
      <div className="mx-auto my-0 max-w-4xl py-4">
        {reply ? <ReplyTextbox onSetReply={setReply} /> : null}
      </div>
      {!isLoadingDiscussion && discussion && discussionState ? (
        <div className="mx-auto my-0 max-w-4xl py-4 pr-8">
          <div className="flex items-center justify-end pb-4" translate="no">
            <span>Sort: </span>
            <CommentSelectFilter />
          </div>
          <DynamicComments
            data={discussionState}
            parent={post_s}
            price_per_hive={price_per_hive}
            parent_depth={post_s.depth}
          />
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

PostPage.getInitialProps = async (ctx: NextPageContext) => {
  const community = String(ctx.query.param);
  const username = String(ctx.query.p2).slice(1);
  const permlink = String(ctx.query.permlink);

  const post_s = await getPost(username, String(permlink));
  return { post_s, community, username, permlink };
};

export default PostPage;
