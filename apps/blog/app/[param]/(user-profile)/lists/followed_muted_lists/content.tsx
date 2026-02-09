'use client';

import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { useInitialFollowList } from '@/blog/components/observer-provider';
import ProfileLists from '@/blog/features/account-lists/profile-lists-component';

const type = 'followed_muted_lists';

const FollowedMutedListsContent = ({ param }: { param: string }) => {
  const username = param.replace('%40', '');
  const initialFollowList = useInitialFollowList();

  const { data } = useFollowListQuery(username, type, initialFollowList);

  return <ProfileLists username={username} variant="followed_muted_lists" data={data} />;
};
export default FollowedMutedListsContent;
