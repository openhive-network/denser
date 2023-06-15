import { useSiteParams } from '@/components/hooks/use-site-params';
import ProfileLists from '@/components/profile-lists-component';
import { useFollowListQuery } from '@/components/hooks/use-follow-list';

export default function Blacklist() {
  const { username } = useSiteParams();
  const blacklistedQuery = useFollowListQuery(username, 'blacklisted');
  if (blacklistedQuery.isLoading) {
    return <div>Loading</div>;
  }
  return <ProfileLists username={username} variant="blacklisted" data={blacklistedQuery.data} />;
}
