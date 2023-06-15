import { useSiteParams } from '@/components/hooks/use-site-params';
import ProfileLists from '@/components/profile-lists-component';
import { useFollowListQuery } from '@/components/hooks/use-follow-list';

export default function FollowedBlacklist() {
  const { username } = useSiteParams();
  const followedBlacklistQuery = useFollowListQuery(username, 'follow_blacklist');
  if (followedBlacklistQuery.isLoading) {
    return <div>Loading</div>;
  }
  return <ProfileLists username={username} variant="followedBlacklist" data={followedBlacklistQuery.data} />;
}
