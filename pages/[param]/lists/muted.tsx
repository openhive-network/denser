import { useSiteParams } from '@/components/hooks/use-site-params';
import ProfileLists from '@/components/profile-lists-component';
import { useFollowListQuery } from '@/components/hooks/use-follow-list';

export default function Muted() {
  const { username } = useSiteParams();
  const mutedQuery = useFollowListQuery(username, 'muted');
  if (mutedQuery.isLoading) {
    return <div>Loading</div>;
  }
  return <ProfileLists username={username} variant="muted" data={mutedQuery.data} />;
}
