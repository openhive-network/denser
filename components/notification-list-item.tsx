import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"

import { Icons } from "@/components/icons"
import { Progress } from "@/components/ui/progress"

const Time = dynamic(() => import("./time"), {
  ssr: false,
})

export function NotificationListItem({ date, msg, score, type, url }) {
  let icon
  switch (type) {
    case "vote":
      icon = <Icons.arrowUpCircle className="h-4 w-4" />
      break
    case "reblog":
      icon = <Icons.forward className="h-4 w-4" />
      break
    case "reply_comment":
      icon = <Icons.comment className="h-4 w-4" />
      break
    case "mention":
      icon = <Icons.atSign className="h-4 w-4" />
      break
    default:
      icon = <Icons.arrowUpCircle className="h-4 w-4" />
  }
  return (
    <>
      <Link href={`/${url}`}>
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
            <div className="flex flex-col">
              <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                {msg}
              </span>
              <span className="flex items-center gap-2">
                {icon}
                <Time time={date} />
              </span>
            </div>
          </div>
          <Progress value={score} className="h-[10px] w-[60px]" />
        </li>
      </Link>
      <hr />
    </>
  )
}
