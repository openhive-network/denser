import BadgeListItem from '@/blog/components/badge-list-item';
import { Badge } from '@/blog/lib/bridge';

const BadgeList = ({ data }: { data: Badge[] }) => {
  return (
    <div className="grid grid-cols-8 gap-2">
      {data?.map((badge: Badge) => (
        <BadgeListItem key={badge.id} title={badge.title} url={badge.url} />
      ))}
    </div>
  );
};

export default BadgeList;
