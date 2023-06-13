import parseDate, { dateToRelative } from '@/lib/parse-date';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CornerUpRight,
  Facebook,
  Link2,
  Linkedin,
  MessageSquare,
  Twitter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserInfo, { UserHoverCard } from '@/components/user-info';
import { getAccount, getActiveVotes, getFeedHistory, getFollowCount } from '@/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getCommunity, getDiscussion, getPost } from '@/lib/bridge';
import Loading from '@/components/loading';
import dynamic from 'next/dynamic';
import ImageGallery from '@/components/image-gallery';
import { proxifyImageSrc } from '@/lib/proxify-images';
import Link from 'next/link';
import { NextPageContext } from 'next';
import DetailsCardHover from '@/components/details-card-hover';
import DetailsCardVoters from '@/components/details-card-voters';
import CommentSelectFilter from '@/components/comment-select-filter';
import { useEffect, useState } from 'react';
import sorter, { SortOrder } from '@/lib/sorter';
import { useRouter } from 'next/router';

const DynamicComments = dynamic(() => import('@/components/comment-list'), {
  loading: () => <Loading />,
  ssr: false
});

function PostPage({ post_s, community, username, permlink }: any) {
  const {
    isLoading: isLoadingDiscussion,
    error: errorDiscussion,
    data: discussion
  } = useQuery(['discussionData', username, permlink], () => getDiscussion(username, String(permlink)), {
    enabled: !!username && !!permlink
  });
  const {
    isLoading: isLoadingFollows,
    error: errorFollows,
    data: follows
  } = useQuery(['followCountData', username], () => getFollowCount(username), {
    enabled: !!username
  });
  const {
    isLoading: isLoadingAccounts,
    error: errorAccount,
    data: account
  } = useQuery(['accountData', username], () => getAccount(username), {
    enabled: !!username
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

  const [discussionState, setDiscussionState] = useState<any[]>();
  const router = useRouter();

  useEffect(() => {
    if (discussion) {
      setDiscussionState(Object.keys(discussion).map((key) => discussion[key]));
    }
  }, [isLoadingDiscussion, discussion]);

  useEffect(() => {
    if (discussionState) {
      const list = [...discussionState];

      sorter(list, SortOrder['trending']);
      setDiscussionState(list);
    }
  }, [isLoadingDiscussion, discussion]);

  useEffect(() => {
    if (router.query.sort === 'trending' && discussionState) {
      const list = [...discussionState];

      sorter(list, SortOrder[router.query.sort]);
      setDiscussionState(list);
    }
    if (router.query.sort === 'votes' && discussionState) {
      const list = [...discussionState];

      sorter(list, SortOrder[router.query.sort]);
      setDiscussionState(list);
    }
    if (router.query.sort === 'new' && discussionState) {
      const list = [...discussionState];

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
    doNotShowImages: false,
    ipfsPrefix: '',
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url: string) => proxifyImageSrc(url, 860, 0, 'webp'),
    usertagUrlFn: (account: string) => '/@' + account,
    hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
    isLinkSafeFn: (url: string) => true
  });

  const post_html = renderer.render(post_s.body);

  return (
    <div className="py-8">
      <div className="mx-auto my-0 max-w-4xl bg-white px-8 py-4 dark:bg-slate-900">
        <h1 className="text-3xl font-bold" data-testid="article-title">
          {post_s.title}
        </h1>
        {!isLoadingFollows && follows && !isLoadingAccounts && account ? (
          <UserInfo
            name={
              account.posting_json_metadata
                ? JSON.parse(account.posting_json_metadata)?.profile?.name
                : account.name
            }
            author={post_s.author}
            author_reputation={post_s.author_reputation}
            authored={post_s.json_metadata?.author}
            community_title={communityData?.title || ''}
            community={community}
            category={post_s.category}
            created={post_s.created}
            following={follows?.following_count || 0}
            followers={follows?.follower_count || 0}
            about={
              account.posting_json_metadata ? JSON.parse(account.posting_json_metadata)?.profile?.about : ''
            }
            joined={account.created}
            active={account.last_post}
          />
        ) : null}
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
          <Loading />
        )}

        <div className="clear-both">
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
                  <Link href={`/trending/${community}`} className="hover:cursor-pointer">
                    {post_s.community_title}
                  </Link>
                ) : (
                  <Link href={`/trending/${post_s.category}`} className="hover:cursor-pointer">
                    #{post_s.category}
                  </Link>
                )}
              </span>
              by
              {!isLoadingFollows && follows && !isLoadingAccounts && account ? (
                <UserHoverCard
                  name={JSON.parse(account.posting_json_metadata)?.profile?.name}
                  author={post_s.author}
                  author_reputation={post_s.author_reputation}
                  following={follows.following_count}
                  followers={follows.follower_count}
                  about={JSON.parse(account.posting_json_metadata)?.profile?.about}
                  joined={account.created}
                  active={account.last_vote_time}
                />
              ) : null}
            </div>
            <div className="flex">
              <CornerUpRight />
              <span className="mx-1">|</span>
              <span className="text-red-500">Reply</span>
              <span className="mx-1">|</span>
              <MessageSquare />
              <span className="text-red-500">{post_s.children}</span>
            </div>
          </div>
          <div className="my-4 flex justify-between">
            <div className="flex gap-4">
              <div className="flex gap-1">
                <ArrowUpCircle />
                <ArrowDownCircle />
              </div>
              {!isHistoryFeedLoading && historyFeedData ? (
                <DetailsCardHover post={post_s} historyFeedData={historyFeedData}>
                  <span
                    className={`text-red-500 hover:cursor-pointer  ${
                      Number(post_s.max_accepted_payout.slice(0, 1)) === 0
                        ? '!text-gray-600 line-through'
                        : ''
                    }`}
                  >
                    ${post_s.payout?.toFixed(2)}
                  </span>
                </DetailsCardHover>
              ) : null}
              {!isActiveVotesLoading && activeVotesData ? (
                <DetailsCardVoters activeVotesData={activeVotesData} post={post_s}>
                  <span className="text-red-500">{post_s.stats?.total_votes} votes</span>
                </DetailsCardVoters>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Facebook />
              <Twitter />
              <Linkedin />
              <Link2 />
            </div>
          </div>
        </div>
      </div>
      {!isLoadingDiscussion && discussion && discussionState ? (
        <div className="mx-auto my-0 max-w-4xl px-8 py-4">
          <div className="flex items-center justify-end">
            <span>Sort: </span>
            <CommentSelectFilter />
          </div>
          <DynamicComments
            data={Object.keys(discussionState).map((key: any) => discussionState[key])}
            parent={post_s}
          />
        </div>
      ) : (
        <Loading />
      )}
    </div>
  );
}

PostPage.getInitialProps = async (ctx: NextPageContext) => {
  const community = String(ctx.query.param);
  const username = String(ctx.query.p2).slice(1);
  const permlink = String(ctx.query.permlink);

  const post_s = await getPost(username, String(permlink));
  return { post_s, community, username, permlink };
};

export default PostPage;
