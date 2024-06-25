import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import ProfileLists from '@/blog/components/profile-lists-component';
import { GetServerSideProps } from 'next';
import { getServerSidePropsDefault } from '../../../lib/get-translations';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

export default function FollowedMutedList() {
  const { username } = useSiteParams();
  const followedMuteQuery = useFollowListQuery(username, 'follow_muted');
  if (followedMuteQuery.isLoading) {
    return <div>Loading</div>;
  }
  return <ProfileLists username={username} variant="followedMute" data={followedMuteQuery.data} />;
}
