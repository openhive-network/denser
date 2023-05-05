import parseDate from '@/lib/parse-date';
import { renderPostBody } from '@ecency/render-helper';
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
import { getAccountFull, getAccounts, getFollowCount, getPost } from '@/lib/hive';
import { dehydrate, QueryClient, useQuery } from '@tanstack/react-query';
import { useSiteParams } from '@/components/hooks/use-site-params';
import { GetServerSideProps } from 'next';
import { FullAccount } from '@/store/app-types';

function PostPage({post_s, followCount_s, account_s}: any) {
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

  const accountMetadata = !isLoadingAccounts && account ? JSON.parse(account[0].posting_json_metadata) : [];

  return (
    <>
      {!isLoadingPost && !isLoadingFollows && !isLoadingAccounts && post && follows && account ? (
        <div className="bg-slate-50 py-8">
          <div className="mx-auto my-0 max-w-4xl bg-white px-8 py-4">
            <h1 className="text-3xl font-bold">{post.title}</h1>
            {accountMetadata ? (
              <UserInfo
                name={accountMetadata.profile?.name}
                author={post.author}
                author_reputation={post.author_reputation}
                community_title={post.community_title}
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
              className="entry-body markdown-view user-selectable prose max-w-full lg:prose-xl"
              dangerouslySetInnerHTML={{
                __html: renderPostBody(post.body, false)
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
            <div className="text-sm text-slate-600">
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
        </div>
      ) : null}
    </>
  );
}

export async function getServerSideProps(context: any) {
  const username = String(context.params.p2).slice(1)
  const permlink = String(context.params.permlink)

  const post_s = await getPost(username, String(permlink))
  const followCount_s =  await getFollowCount(username)
  const account_s = await getAccounts([username])

  return { props: { post_s, followCount_s, account_s } };
}


export default PostPage;
