import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"

import { Icons } from "@/components/icons"

const Time = dynamic(() => import("./time"), {
  ssr: false,
})

export default function CommentListItem({ comment }) {
  return (
    <li className="list-none" key={comment.id}>
      <div className="mt-7 flex w-full items-center">
        <Image
          src="/olivia.png"
          className="mr-3 rounded-full"
          alt=""
          width={40}
          height={40}
        />
        <div className="flex flex-col text-slate-500 dark:text-slate-400">
          <p>
            <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
              @{comment.author}
            </span>{" "}
            ({comment.author_reputation.toFixed(0)}) in{" "}
            <span>
              {/*<Link href={`/trending/${comment.json_metadata.tags[0]}`}>*/}
              {/*  #{comment.json_metadata.tags[0]}*/}
              {/*</Link>*/}
            </span>{" "}
            <span className="mx-1">&#x2022;</span>
            <Time time={comment.created} />
          </p>
          <p></p>
        </div>
      </div>
      <div className="my-4 flex flex-col items-center gap-7 md:max-h-[200px] md:flex-row md:items-start">
        <div key={comment.id} className="mb-10 w-full whitespace-nowrap">
          <h2 className="text-lg font-semibold leading-5 text-slate-900 dark:text-white">
            {comment.title}
          </h2>
          <p className="mt-2 mb-7 overflow-hidden text-ellipsis text-base font-normal leading-6 text-slate-500 dark:text-slate-400">
            {comment.body}
          </p>
          <ul className="flex">
            <li className="mr-4 flex items-center space-x-1">
              <Icons.arrowUpCircle className="h-5 w-5" />
              <Icons.arrowDownCircle className="h-5 w-5" />
              <span className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
                ${comment.payout.toFixed(2)}
              </span>
            </li>
            <li className="mr-4 flex items-center">
              <Icons.chevronUp className="h-5 w-5" />
              <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
                {comment.stats.total_votes}
              </span>
            </li>
            <li className="mr-4 flex items-center">
              <Icons.comment className="h-5 w-5" />
              <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
                {comment.children}
              </span>
            </li>
          </ul>
        </div>
      </div>
      <hr />
    </li>
  )
}
