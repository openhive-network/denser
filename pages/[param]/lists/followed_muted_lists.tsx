import { useFollowListQuery } from '@/components/hooks/use-follow-list';
import { useSiteParams } from '@/components/hooks/use-site-params';
import ProfileLists from '@/components/profile-lists-component';

export default function FollowedMutedList() {
  const { username } = useSiteParams();
  const followedMuteQuery = useFollowListQuery(username, 'follow_muted');
  if (followedMuteQuery.isLoading) {
    return <div>Loading</div>;
  }
  return <ProfileLists username={username} variant="followedMut" data={followedMuteQuery.data} />;
}
