import parseDate from '@/lib/parse-date';
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
import moment from 'moment';

import { Button } from '@/components/ui/button';
import UserInfo, { UserHoverCard } from '@/components/user-info';
import { getAccounts, getFollowCount, getPost } from '@/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { useSiteParams } from '@/components/hooks/use-site-params';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getCommunity, getDiscussion } from '@/lib/bridge';
import CommentList from '@/components/comment-list';
import Loading from '@/components/loading';
import dynamic from 'next/dynamic';

const DynamicComments = dynamic(() => import('@/components/comment-list'), {
  loading: () => <Loading />,
  ssr: false
});

function PostPage({ post_s, followCount_s, account_s, discussion_s, community_s, post_html }: any) {
  const { username, community, permlink } = useSiteParams();
  const {
    isLoading: isLoadingPost,
    error: errorPost,
    data: post
  } = useQuery(['getPost', permlink, post_s], () => getPost(username, String(permlink)), {
    initialData: post_s,
    enabled: !!username && !!community && !!permlink
  });
  const {
    isLoading: isLoadingFollows,
    error: errorFollows,
    data: follows
  } = useQuery(['followCountData', username, followCount_s], () => getFollowCount(username), {
    initialData: followCount_s,
    enabled: !!username && !!community && !!permlink
  });
  const {
    isLoading: isLoadingAccounts,
    error: errorAccount,
    data: account
  } = useQuery(['accountData', username, account_s], () => getAccounts([username]), {
    initialData: account_s,
    enabled: !!username && !!community && !!permlink
  });
  const {
    isLoading: isLoadingDiscussion,
    error: errorDiscussion,
    data: discussion
  } = useQuery(['discussionData', permlink, discussion_s], () => getDiscussion(username, String(permlink)), {
    initialData:  discussion_s,
    enabled: !!username && !!community && !!permlink
  });
  const {
    isLoading: isLoadingCommunity,
    error: errorCommunity,
    data: communityData
  } = useQuery(['communityData', community, community_s], () => getCommunity(community || community_s.name), {
    initialData: community_s,
    enabled: !!username && !!community && !!permlink
  });

  const accountMetadata = !isLoadingAccounts && account ? JSON.parse(account[0].posting_json_metadata) : [];

  return (
    <>
      {(!isLoadingPost && !isLoadingFollows && !isLoadingAccounts) ||
      (!isLoadingCommunity && post && follows && account) ||
      communityData ? (
        <div className="bg-slate-50 py-8">
          <div className="mx-auto my-0 max-w-4xl bg-white px-8 py-4">
            <h1 className="text-3xl font-bold" data-testid="article-title">{post.title}</h1>
            {accountMetadata ? (
              <UserInfo
                name={accountMetadata.profile?.name}
                author={post.author}
                author_reputation={post.author_reputation}
                community_title={communityData?.title}
                created={post.created}
                following={follows.following_count}
                followers={follows.follower_count}
                about={accountMetadata.profile?.about}
                joined={account[0].created}
                active={account[0].last_vote_time}
              />
            ) : null}
            <hr />
            <div
              id="articleBody"
              className="entry-body markdown-view user-selectable prose max-w-full"
              dangerouslySetInnerHTML={{
                __html: post_html
              }}
            />
            <div className="clear-both">
              <ul className="flex gap-2">
                {post.json_metadata?.tags?.map((tag: string) => (
                  <li key={tag}>
                    <Button variant="ghost" size="sm">
                      #{tag}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-sm text-slate-600" data-testid="author-data-post-footer">
              <div className="my-4 flex justify-between">
                <div className="flex flex-wrap">
                  <Clock />
                  <span className="px-1" title={String(moment(parseDate(post.created)))}>
                    {moment(parseDate(post.created)).fromNow()}
                  </span>
                  in
                  <span className="px-1 font-bold hover:text-red-500">{post.community_title}</span>
                  by
                  {accountMetadata ? (
                    <UserHoverCard
                      name={accountMetadata.profile?.name}
                      author={post.author}
                      author_reputation={post.author_reputation}
                      following={follows.following_count}
                      followers={follows.follower_count}
                      about={accountMetadata.profile?.about}
                      joined={account[0].created}
                      active={account[0].last_vote_time}
                    />
                  ) : null}
                </div>
                <div className="flex">
                  <CornerUpRight />z<span className="mx-1">|</span>
                  <span className="text-red-500">Reply</span>
                  <span className="mx-1">|</span>
                  <MessageSquare />
                  <span className="text-red-500">{post.children}</span>
                </div>
              </div>
              <div className="my-4 flex justify-between">
                <div className="flex gap-4">
                  <div className="flex gap-1">
                    <ArrowUpCircle />
                    <ArrowDownCircle />
                  </div>
                  <span className="text-red-500">${post.payout?.toFixed(2)}</span>
                  <span className="text-red-500">{post.active_votes?.length} votes</span>
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
          <div className="mx-auto my-0 max-w-4xl px-8 py-4">
            <DynamicComments data={Object.keys(discussion).map((key) => discussion[key])} parent={post} />
          </div>
        </div>
      ) : null}
    </>
  );
}

export async function getServerSideProps(context: any) {
  context.res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
  const community = String(context.params.param);
  const username = String(context.params.p2).slice(1);
  const permlink = String(context.params.permlink);

  const post_s = await getPost(username, String(permlink));
  const followCount_s = await getFollowCount(username);
  const account_s = await getAccounts([username]);
  const discussion_s = await getDiscussion(username, String(permlink))
  let community_s = null;
  if (community.startsWith('hive-')) {
    community_s = await getCommunity(community);
  }

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
    imageProxyFn: (url: string) => 'https://images.hive.blog/1536x0/' + url,
    usertagUrlFn: (account: string) => '/@' + account,
    hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
    isLinkSafeFn: (url: string) => true
  });

  const post_html = renderer.render(post_s.body);

  return { props: { post_s, followCount_s, account_s, discussion_s, community_s, post_html } };
}

export default PostPage;
