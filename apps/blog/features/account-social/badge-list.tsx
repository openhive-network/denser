import type { Badge } from '@transaction/lib/extended-hive.chain';
import BadgeListItem from './badge-list-item';

const BadgeList = ({ data, username }: { data: Badge[]; username?: string }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {data?.map((badge: Badge) => (
        <BadgeListItem key={badge.id} title={badge.title} url={badge.url} username={username} />
      ))}
    </div>
  );
};

export default BadgeList;
