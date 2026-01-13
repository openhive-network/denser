'use client';

import CommunitiesListItem from '@/blog/features/communities-list/communities-list-item';
import { Community } from '@hive/common-hiveio-packages/wax';

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
