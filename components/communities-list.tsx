import CommunitiesListItem from '@/components/communities-list-item';
import { Community } from '@/lib/bridge';

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
