import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import ProfileLists from '@/blog/components/profile-lists-component';

export default function FollowedMutedList() {
  const { username } = useSiteParams();
  const followedMuteQuery = useFollowListQuery(username, 'follow_muted');
  if (followedMuteQuery.isLoading) {
    return <div>Loading</div>;
  }
  return <ProfileLists username={username} variant="followedMut" data={followedMuteQuery.data} />;
}
