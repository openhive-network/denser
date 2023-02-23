"use client"

import Image from "next/image"

import { dateToRelative } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Icons } from '@/components/icons';

export function NotificationListItem({ username, action, timestamp }) {
  // notes to future work
  // object from api looks like
  // {
  //   "id": 12177118,
  //   "type": "reply",
  //   "score": 40,
  //   "date": "2023-02-23T13:39:06",
  //   "msg": "@mooontivated replied to your post",
  //   "url": "@mooontivated\/re-edicted-rqjcl0"
  // }
  return (
    <>
      <li className="flex justify-between py-4">
        <div className="flex items-center">
          <Image
            src="/olivia.png"
            alt="Profile picture"
            className="mr-3 rounded-3xl"
            height="40"
            width="40"
            priority
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                {username}
              </span>
              <span className="flex items-center gap-2">
                <Icons.comment className="h-4 w-4" /> {/*action icon type*/}
                {dateToRelative(timestamp)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-900 dark:text-white">{action}</span>
            </div>
          </div>
        </div>
        <Progress value={20} className="h-[10px] w-[60px]" />
      </li>
      <hr />
    </>
  )
}
