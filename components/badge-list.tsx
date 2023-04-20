import BadgeListItem from '@/components/badge-list-item';

const BadgeList = ({ data }: { data: any }) => {
  return (
    <div className="grid grid-cols-8 gap-2">
      {data?.map((badge: any) => (
        <BadgeListItem key={badge.id} title={badge.title} url={badge.url} />
      ))}
    </div>
  );
};

export default BadgeList;
