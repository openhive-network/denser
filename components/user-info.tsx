import Link from 'next/link';
import parseDate, { dateToFormatted, dateToRelative } from '@/lib/parse-date';

import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import UserAvatar from '@/components/user-avatar';
import accountReputation from '@/lib/account-reputation';

interface UserHoverCardProps {
  name: string;
  author: string;
  author_reputation: number;
  following: number;
  followers: number;
  about: string;
  joined: string;
  active: string;
  withImage?: boolean;
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
  withImage = false
}: UserHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <div
          className={`flex items-center font-bold hover:cursor-pointer hover:text-red-500 ${
            withImage ? '' : 'px-1'
          }`}
        >
          {withImage && <UserAvatar username={author} size="normal" />}
          <Link href={`/@${author}`} className="hover:cursor-pointer hover:text-red-600">
            {author}
          </Link>
          <span className="mr-1 block font-normal">({accountReputation(author_reputation)})</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-72" data-testid="user-hover-card-content">
        <div className="space-y-2 text-black">
          <div className="flex">
            <UserAvatar username={author} size="large" />
            <div>
              <span className="block font-bold">{name}</span>
              <Link href={`/@${author}`} className="flex hover:cursor-pointer hover:text-red-600">
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
            <div className="flex flex-col items-center" data-testid="user-followers">
              {followers}
              <span>Followers</span>
            </div>
            <div className="flex flex-col items-center" data-testid="user-following">
              {following}
              <span>Following</span>
            </div>
            {/*TODO*/}
            {/*<div className="flex flex-col items-center" data-testid="user-hp">*/}
            {/*  123*/}
            {/*  <span>HP</span>*/}
            {/*</div>*/}
          </div>
          <p data-testid="user-about">{about}</p>
          <div className="flex justify-center text-sm">
            Joined {dateToFormatted(joined, 'MMMM YYYY')}
            <span className="mx-1">•</span>
            Active {dateToRelative(active)} ago
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface UserInfoProps extends UserHoverCardProps {
  authored?: string;
  community_title: string;
  community: string;
  category: string;
  created: string;
}

function UserInfo({
  authored,
  community,
  community_title,
  category,
  created,
  name,
  author,
  author_reputation,
  following,
  followers,
  about,
  joined,
  active
}: UserInfoProps) {
  return (
    <div className="flex flex-col py-4 text-slate-500" data-testid="author-data">
      <div className="flex  flex-wrap items-center">
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
        <span className="ml-1">
          {community_title ? (
            <Link href={`/trending/${community}`} className="hover:cursor-pointer hover:text-red-600">
              {community_title}
            </Link>
          ) : (
            <Link href={`/trending/${category}`} className="hover:cursor-pointer hover:text-red-600">
              #{category}
            </Link>
          )}
        </span>
        <span className="mx-1">•</span>
        <span title={String(parseDate(created))}>{dateToRelative(created)}</span>
      </div>
      {authored ? (
        <span className="ml-1 text-xs">
          Aurhored by{' '}
          <Link className="hover:cursor-pointer hover:text-red-500" href={`/@${authored}`}>
            @{authored}
          </Link>
        </span>
      ) : null}
    </div>
  );
}

export default UserInfo;
