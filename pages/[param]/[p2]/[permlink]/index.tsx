import { useRouter } from "next/router"
import parseDate from "@/helpers/parse-date"
import { useGetPost, useGetSubscriptions } from "@/services/bridgeService"
import { useGetAccounts, useGetFollow } from "@/services/hiveService"
import { renderPostBody } from "@ecency/render-helper"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CornerUpRight,
  Facebook,
  Link2,
  Linkedin,
  MessageSquare,
  Twitter,
} from "lucide-react"
import moment from "moment"

import { Layout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import UserInfo, { UserHoverCard } from "@/components/user-info"

function PostPage() {
  const router = useRouter()
  const params = router.query
  const author = String(params?.p2).startsWith("@")
    ? String(params?.p2.slice(1))
    : ""
  const community = String(params.param).startsWith("hive-") ? params.param : ""
  const permlink = params.permlink
  const {
    isLoading: isLoadingPost,
    error: errorPost,
    data: post,
  } = useGetPost(author, permlink, "")
  const {
    isLoading: isLoadingFollows,
    error: errorFollows,
    data: follows,
  } = useGetFollow(author, author)
  const {
    isLoading: isLoadingAccounts,
    error: errorAccount,
    data: account,
  } = useGetAccounts(author, author)
  const accountMetadata = !isLoadingAccounts
    ? JSON.parse(account[0].posting_json_metadata)
    : []

  return (
    <Layout>
      {!isLoadingPost && !isLoadingFollows && !isLoadingAccounts ? (
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
              className="entry-body markdown-view user-selectable prose max-w-full"
              dangerouslySetInnerHTML={{
                __html: renderPostBody(post.body, false),
              }}
            />
            <div className="clear-both">
              <ul className="flex gap-2">
                {post.json_metadata.tags.map((tag: string) => (
                  <li key={tag}>
                    <Button variant="subtle" size="sm">
                      #{tag}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-sm text-slate-600">
              <div className="my-4 flex justify-between">
                <div className="flex">
                  <Clock />
                  <span
                    className="px-1"
                    title={String(moment(parseDate(post.created)))}
                  >
                    {moment(parseDate(post.created)).fromNow()}
                  </span>
                  in
                  <span className="px-1 font-bold hover:text-red-500">
                    {post.community_title}
                  </span>
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
                  <span className="text-red-500">
                    ${post.payout.toFixed(2)}
                  </span>
                  <span className="text-red-500">
                    {post.active_votes.length} votes
                  </span>
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
    </Layout>
  )
}

export default PostPage
