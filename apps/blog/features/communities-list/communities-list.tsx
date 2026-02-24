'use client';

import CommunitiesListItem from '@/blog/features/communities-list/communities-list-item';
import { Community } from '@hive/common-hiveio-packages/wax';

const CommunitiesList = ({
  data,
  userSubscriptions
}: {
  data: Community[] | null | undefined;
  userSubscriptions?: string[][] | null;
}) => {
  return (
    <ul>
      {data?.map((community: Community) => (
        <CommunitiesListItem
          community={community}
          key={community.name}
          subscribedFromList={userSubscriptions?.some((sub) => sub[0] === community.name)}
        />
      ))}
    </ul>
  );
};

export default CommunitiesList;
