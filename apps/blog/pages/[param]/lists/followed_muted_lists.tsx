import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import ProfileLists from '@/blog/components/profile-lists-component';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';

export default function FollowedMutedList() {
  const { username } = useSiteParams();
  const followedMuteQuery = useFollowListQuery(username, 'follow_muted');
  if (followedMuteQuery.isLoading) {
    return <div>Loading</div>;
  }
  return <ProfileLists username={username} variant='followedMut' data={followedMuteQuery.data} />;
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_blog']))
    }
  };
};