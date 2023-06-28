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
          <span className="hover:cursor-pointer hover:text-red-600">{author}</span>
          <span className="mr-1 block font-normal">({accountReputation(author_reputation)})</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-72" data-testid="user-hover-card-content">
        <div className="space-y-2">
          <div className="flex">
            <Link href={`/@${author}`}>
              <UserAvatar username={author} size="large" className="h-[75px] w-[75px]" />
            </Link>
            <div>
              <Link href={`/@${author}`} className="block font-bold hover:cursor-pointer">
                {name}
              </Link>
              <Link href={`/@${author}`} className="flex text-sm text-gray-500 hover:cursor-pointer">
                <span className="block">{`@${author}`}</span>
              </Link>
              <div className="grid grid-cols-2 gap-2 py-2">
                <Button
                  variant="outline"
                  size="xs"
                  className="border border-red-500 bg-transparent p-1 uppercase text-red-500 hover:border-red-600 hover:text-red-600"
                >
                  Follow
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center" data-testid="user-followers">
              {followers}
              <span className="text-xs">Followers</span>
            </div>
            <div className="flex flex-col items-center" data-testid="user-following">
              {following}
              <span className="text-xs">Following</span>
            </div>
            {/*TODO*/}
            {/*<div className="flex flex-col items-center" data-testid="user-hp">*/}
            {/*  123*/}
            {/*  <span className="text-xs">HP</span>*/}
            {/*</div>*/}
          </div>
          <p data-testid="user-about" className="text-sm text-gray-500">
            {about}
          </p>
          <div className="flex justify-center text-xs">
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
      <div className="flex flex-wrap items-center">
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
        <span title={String(parseDate(created))}>{dateToRelative(created)} ago</span>
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
