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
import { UserHoverCard } from '@/components/user-info';
import { getAccounts, getFollowCount, getPost } from '@/lib/hive';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getCommunity, getDiscussion } from '@/lib/bridge';
import Loading from '@/components/loading';
import dynamic from 'next/dynamic';

const DynamicComments = dynamic(() => import('@/components/comment-list'), {
  loading: () => <Loading />,
  ssr: false
});

const DynamicUserInfo = dynamic(() => import('@/components/user-info'), {
  loading: () => <Loading />,
  ssr: false
})

function PostPage({ post_s, followCount_s, account_s, discussion_s, community_s, post_html, account_metadata }: any) {
  return (
    <>
        <div className="bg-slate-50 py-8">
          <div className="mx-auto my-0 max-w-4xl bg-white px-8 py-4">
            <h1 className="text-3xl font-bold">{post_s.title}</h1>
            {account_metadata ? (
              <DynamicUserInfo
                name={account_metadata.profile?.name}
                author={post_s.author}
                author_reputation={post_s.author_reputation}
                community_title={community_s?.title}
                created={post_s.created}
                following={followCount_s.following_count}
                followers={followCount_s.follower_count}
                about={account_metadata.profile?.about}
                joined={account_s[0].created}
                active={account_s[0].last_vote_time}
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
                {post_s.json_metadata?.tags?.map((tag: string) => (
                  <li key={tag}>
                    <Button variant="ghost" size="sm">
                      #{tag}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-sm text-slate-600">
              <div className="my-4 flex justify-between">
                <div className="flex flex-wrap">
                  <Clock />
                  <span className="px-1" title={String(moment(parseDate(post_s.created)))}>
                    {moment(parseDate(post_s.created)).fromNow()}
                  </span>
                  in
                  <span className="px-1 font-bold hover:text-red-500">{post_s.community_title}</span>
                  by
                  {account_metadata ? (
                    <UserHoverCard
                      name={account_metadata.profile?.name}
                      author={post_s.author}
                      author_reputation={post_s.author_reputation}
                      following={followCount_s.following_count}
                      followers={followCount_s.follower_count}
                      about={account_metadata.profile?.about}
                      joined={account_s[0].created}
                      active={account_s[0].last_vote_time}
                    />
                  ) : null}
                </div>
                <div className="flex">
                  <CornerUpRight />z<span className="mx-1">|</span>
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
                  <span className="text-red-500">${post_s.payout?.toFixed(2)}</span>
                  <span className="text-red-500">{post_s.active_votes?.length} votes</span>
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
            <DynamicComments data={Object.keys(discussion_s).map((key) => discussion_s[key])} parent={post_s} />
          </div>
        </div>
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

  const account_metadata = account_s ? JSON.parse(account_s[0].posting_json_metadata) : [];

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

  return { props: { post_s, followCount_s, account_s, discussion_s, community_s, post_html, account_metadata } };
}

export default PostPage;
