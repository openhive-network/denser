"use client"

import Link from "next/link"

import { dateToRelative } from "@/lib/utils"
import { Icons } from "@/components/icons"
import Image from 'next/image';

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
              <Link href={`/trending/${comment.json_metadata.tags[0]}`}>
                #{comment.json_metadata.tags[0]}
              </Link>
            </span>{" "}
            <span className="mx-1">&#x2022;</span>
            <span>{dateToRelative(comment.created)}</span>
          </p>
          <p></p>
        </div>
      </div>
      <div className="my-4 flex flex-col items-center gap-7 md:max-h-[200px] md:flex-row md:items-start">
        <div key={comment.id} className="mb-10 w-full">
          <h2 className="text-lg font-semibold leading-5 text-slate-900 dark:text-white">
            {comment.title}
          </h2>
          {/*TODO: Work on bodyLine - sanitized first 150 characters from body*/}
          <p className="mt-2 mb-7 text-base font-normal leading-6 text-slate-500 dark:text-slate-400">
            {comment?.bodyLine}
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
