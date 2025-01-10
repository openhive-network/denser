import { useSiteParams } from '@ui/components/hooks/use-site-params';
import ProfileLists from '@/blog/components/profile-lists-component';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { GetServerSideProps } from 'next';
import { getDefaultProps } from '../../../lib/get-translations';

export const getServerSideProps: GetServerSideProps = getDefaultProps;

export default function Muted() {
  const { username } = useSiteParams();
  const mutedQuery = useFollowListQuery(username, 'muted');
  if (mutedQuery.isLoading) {
    return <div>Loading</div>;
  }
  return <ProfileLists username={username} variant="muted" data={mutedQuery.data} />;
}
