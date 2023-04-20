import Link from "next/link"
import parseDate, {
  dateToFormatted,
  dateToRelative,
} from "@/lib/parse-date"
import moment from "moment"

import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import UserAvatar from "@/components/user-avatar"

interface UserHoverCardProps {
  name: string
  author: string
  author_reputation: number
  following: number
  followers: number
  about: string
  joined: string
  active: string
  withImage?: boolean
}

export function UserHoverCard({
  name,
  author,
  author_reputation,
  following,
  followers,
  about,
  joined,
  active,
  withImage = false,
}: UserHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <div
          className={`flex items-center font-bold hover:text-red-500 ${
            withImage ? "" : "px-1"
          }`}
        >
          {withImage && <UserAvatar username={author} size="normal" />}
          {author}
          <span className="mr-1 block font-normal">
            ({author_reputation.toFixed(0)})
          </span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <div className="space-y-2 text-black">
          <div className="flex">
            <UserAvatar username={author} size="large" />
            <div>
              <span className="block font-bold">{name}</span>
              <Link href={"/"} className="flex">
                <span className="block">{`@${author}`}</span>
              </Link>
              <div className="grid grid-cols-2 gap-2 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border border-red-500 bg-transparent uppercase text-red-500 hover:bg-red-100 dark:border-red-700 dark:text-red-100"
                >
                  Follow
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border border-red-500 bg-transparent uppercase text-red-500 hover:bg-red-100 dark:border-red-700 dark:text-red-100"
                >
                  Mute
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center">
              {followers}
              <span>Followers</span>
            </div>
            <div className="flex flex-col items-center">
              {following}
              <span>Following</span>
            </div>
            <div className="flex flex-col items-center">
              123
              <span>HP</span>
            </div>
          </div>
          <p>{about}</p>
          <div className="flex justify-center text-sm">
            Joined {dateToFormatted(joined, "MMMM YYYY")}
            <span className="mx-1">•</span>
            Active {dateToRelative(active)} ago
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

interface UserInfoProps extends UserHoverCardProps {
  community_title: string
  created: string
}

function UserInfo({
  community_title,
  created,
  name,
  author,
  author_reputation,
  following,
  followers,
  about,
  joined,
  active,
}: UserInfoProps) {
  return (
    <div className="flex items-center py-4 text-slate-500 flex-wrap">
      <UserHoverCard
        name={name}
        author={author}
        author_reputation={author_reputation}
        following={following}
        followers={followers}
        about={about}
        joined={joined}
        active={active}
        withImage
      />
      in
      <span className="ml-1">{community_title}</span>
      <span className="mx-1">•</span>
      <span title={String(moment(parseDate(created)))}>
        {moment(parseDate(created)).fromNow()}
      </span>
    </div>
  )
}

export default UserInfo
