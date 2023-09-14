import BadgeListItem from '@/blog/components/badge-list-item';
import { Badge } from '@/blog/lib/bridge';

const BadgeList = ({ data, username }: { data: Badge[]; username?:string }) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {data?.map((badge: Badge) => (
        <BadgeListItem key={badge.id} title={badge.title} url={badge.url} username={username} />
      ))}
    </div>
  );
};

export default BadgeList;
