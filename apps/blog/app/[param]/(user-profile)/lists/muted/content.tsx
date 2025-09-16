'use client';

import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import ProfileLists from '@/blog/features/account-lists/profile-lists-component';

const type = 'muted';

const MutedContent = ({ param }: { param: string }) => {
  const username = param.replace('%40', '');

  const { data } = useFollowListQuery(username, type);

  return <ProfileLists username={username} variant={type} data={data} />;
};
export default MutedContent;
