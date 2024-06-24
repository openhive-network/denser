import { useSiteParams } from '@ui/components/hooks/use-site-params';
import ProfileLists from '@/blog/components/profile-lists-component';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { GetServerSideProps } from 'next';
import { getServerSidePropsDefault } from '../../../lib/get-translations';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

export default function FollowedBlacklist() {
  const { username } = useSiteParams();
  const followedBlacklistQuery = useFollowListQuery(username, 'follow_blacklist');
  if (followedBlacklistQuery.isLoading) {
    return <div>Loading</div>;
  }
  return <ProfileLists username={username} variant="followedBlacklist" data={followedBlacklistQuery.data} />;
}
