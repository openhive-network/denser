'use client';

import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import ProfileLists from '@/blog/features/account-lists/profile-lists-component';

const type = 'followed_muted_lists';

const FollowedMutedListsContent = ({ param }: { param: string }) => {
  const username = param.replace('%40', '');

  const { data } = useFollowListQuery(username, type);

  return <ProfileLists username={username} variant="followed_muted_lists" data={data} />;
};
export default FollowedMutedListsContent;
