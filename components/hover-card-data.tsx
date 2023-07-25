import { dateToFormatted, dateToRelative } from '@/lib/parse-date';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/user-avatar';
import Link from 'next/link';
import { useAccountQuery } from './hooks/use-accout';
import { useFollowsQuery } from './hooks/use-follows';

export function HoverCardData({ author }: { author: string }) {
  const follows = useFollowsQuery(author);
  const account = useAccountQuery(author);
  return (
    <div className="space-y-2">
      {account.data && !account.isLoading && follows.data && !follows.isLoading ? (
        <>
          <div className="flex">
            <Link href={`/@${author}`}>
              <UserAvatar username={author} size="large" className="h-[75px] w-[75px]" />
            </Link>
            <div>
              <Link href={`/@${author}`} className="block font-bold hover:cursor-pointer">
                {JSON.parse(account.data.posting_json_metadata)?.profile?.name}
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
              {follows.data.follower_count}
              <span className="text-xs">Followers</span>
            </div>
            <div className="flex flex-col items-center" data-testid="user-following">
              {follows.data.following_count}
              <span className="text-xs">Following</span>
            </div>
            {/*<div className="flex flex-col items-center" data-testid="user-hp">*/}
            {/*  123*/}
            {/*  <span className="text-xs">HP</span>*/}
            {/*</div>*/}
          </div>
          <p data-testid="user-about" className="text-sm text-gray-500">
            {JSON.parse(account.data.posting_json_metadata)?.profile?.about}
          </p>
          <div className="flex justify-center text-xs">
            Joined {dateToFormatted(account.data.created, 'MMMM YYYY')}
            <span className="mx-1">•</span>
            Active {dateToRelative(account.data.last_vote_time)} ago
          </div>
        </>
      ) : null}
    </div>
  );
}
