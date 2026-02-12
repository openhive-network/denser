'use client';

import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import ProfileLists from '@/blog/features/account-lists/profile-lists-component';
import { IFollowList } from '@hive/common-hiveio-packages/wax';

const type = 'blacklisted';
const BlacklistedUsersContent = ({
  param,
  initialData
}: {
  param: string;
  initialData: IFollowList[] | null;
}) => {
  const username = param.replace('%40', '');
  const { data } = useFollowListQuery(username, type, initialData);

  return <ProfileLists username={username} variant="blacklisted" data={data} />;
};
export default BlacklistedUsersContent;
