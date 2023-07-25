import Link from 'next/link';
import parseDate, { dateToRelative } from '@/lib/parse-date';
import { Badge } from '@/components/ui/badge';
import { UserHoverCard, UserHoverCardProps } from './user-hover-card';

interface UserInfoProps extends UserHoverCardProps {
  authored?: string;
  community_title: string;
  community: string;
  category: string;
  created: string;
  author_title?: string;
}

function UserInfo({
  authored,
  community,
  community_title,
  category,
  created,
  author,
  author_reputation,
  author_title
}: UserInfoProps) {
  return (
    <div className="flex flex-col py-4 text-slate-500" data-testid="author-data">
      <div className="flex flex-wrap items-center">
        <UserHoverCard author={author} author_reputation={author_reputation} withImage />
        {author_title ? (
          <Badge variant="outline" className="mr-1 border-red-600 text-slate-500">
            {author_title}
          </Badge>
        ) : null}
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
