import CommunitiesListItem from '@/components/communities-list-item';

const CommunitiesList = ({ data }: { data: any}) => {
  return (
    <ul>
      {data?.map((community: any) => (
        <CommunitiesListItem community={community} key={community.name} />
      ))}
    </ul>
  );
};

export default CommunitiesList;
