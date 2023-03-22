import dynamic from "next/dynamic"

import { getPostSummary } from "@/lib/utils"
import { Icons } from "@/components/icons"

const Time = dynamic(() => import("./time"), {
  ssr: false,
})

const Payout = dynamic(() => import("./payout"), {
  ssr: false,
})

const Votes = dynamic(() => import("./votes"), {
  ssr: false,
})

const Children = dynamic(() => import("./children"), {
  ssr: false,
})

export default function PostListItem({ post }: any) {
  return (
    <li className="my-4 flex flex-col">
      {post.reblogged_by !== undefined && post.reblogged_by.length > 0 ? (
        <div className="flex">
          <Icons.forward className="h-5 w-5" /> {post.reblogged_by[0]} reblogged
        </div>
      ) : null}
      <div
        className={`my-4 flex flex-col items-center gap-7 lg:max-h-[200px] lg:flex-row lg:items-start ${
          post.reblogged_by !== undefined && post.reblogged_by.length > 0
            ? "mt-0"
            : ""
        }`}
      >
        <div className="flex">
          {post.json_metadata.image ? (
            <div className="relative flex h-full max-h-[200px] min-h-[200px] w-full items-center overflow-hidden bg-gray-100 lg:min-w-[320px] lg:max-w-[320px]">
              <img src={post.json_metadata.image[0]} alt="Post image" />
              <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center bg-gradient-to-r from-slate-400 text-white dark:text-white">
                {post.community_title}
              </div>
            </div>
          ) : post.json_metadata.images ? (
            <div className="relative flex h-full max-h-[200px] min-h-[200px] w-full items-center overflow-hidden bg-gray-100 lg:min-w-[320px] lg:max-w-[320px]">
              <img src={post.json_metadata.images[0]} alt="Post image" />
              <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center bg-gradient-to-r from-slate-400 text-white dark:text-white">
                {post.community_title}
              </div>
            </div>
          ) : post.json_metadata?.flow?.pictures[0] ? (
            <div className="relative flex h-full max-h-[200px] min-h-[200px] w-full items-center overflow-hidden bg-gray-100 lg:min-w-[320px] lg:max-w-[320px]">
              <img
                src={post.json_metadata.flow.pictures[0].url}
                alt="Post image"
              />
              <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center bg-gradient-to-r from-slate-400 text-white dark:text-white">
                {post.community_title}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col overflow-hidden">
          <div key={post.id} className="mb-10 w-full whitespace-nowrap">
            <h2 className="text-lg font-semibold leading-5 text-slate-900 dark:text-white">
              {post.title}
            </h2>
            <p className="mt-2 mb-7 overflow-hidden text-ellipsis text-base font-normal leading-6 text-slate-500 dark:text-slate-400">
              {getPostSummary(post.json_metadata, post.body)}
            </p>
            <ul className="flex">
              <li className="mr-4 flex items-center space-x-1">
                <Icons.arrowUpCircle className="h-5 w-5" />
                <Icons.arrowDownCircle className="h-5 w-5" />
                <span className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
                  <Payout amount={post.payout} />
                </span>
              </li>
              <li className="mr-4 flex items-center">
                <Icons.chevronUp className="h-5 w-5" />
                <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
                  <Votes votes={post.stats.total_votes} />
                </span>
              </li>
              <li className="mr-4 flex items-center">
                <Icons.comment className="h-5 w-5" />
                <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
                  <Children>{post.children}</Children>
                </span>
              </li>
              <li className="flex items-center">
                <Icons.forward className="h-5 w-5" />
              </li>
            </ul>
            <div className="mt-7 flex items-center">
              <img
                className="mr-3 h-[40px] w-[40px] rounded-3xl"
                height="40"
                width="40"
                src={`https://images.hive.blog/u/${post.author}/avatar`}
                alt={`${post.author} profile picture`}
              />
              <div className="flex flex-col text-slate-500 dark:text-slate-400">
                <p>
                  @{post.author} ({post.author_reputation.toFixed(0)})
                </p>
                <Time time={post.created} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
