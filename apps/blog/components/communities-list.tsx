import CommunitiesListItem from '@/blog/components/communities-list-item';
import { Community } from '@ui/lib/bridge';

const CommunitiesList = ({ data }: { data: Community[] | null | undefined }) => {
  return (
    <ul>
      {data?.map((community: Community) => (
        <CommunitiesListItem community={community} key={community.name} />
      ))}
    </ul>
  );
};

export default CommunitiesList;
