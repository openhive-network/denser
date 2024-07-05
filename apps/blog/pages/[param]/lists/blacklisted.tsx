import { useSiteParams } from '@ui/components/hooks/use-site-params';
import ProfileLists from '@/blog/components/profile-lists-component';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { GetServerSideProps } from 'next';
import { getServerSidePropsDefault } from '../../../lib/get-translations';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

export default function Blacklist() {
  const { username } = useSiteParams();
  const blacklistedQuery = useFollowListQuery(username, 'blacklisted');
  if (blacklistedQuery.isLoading) {
    return <div>Loading</div>;
  }
  return <ProfileLists username={username} variant="blacklisted" data={blacklistedQuery.data} />;
}
