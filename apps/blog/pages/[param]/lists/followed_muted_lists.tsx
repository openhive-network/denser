import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import ProfileLists from '@/blog/components/profile-lists-component';
import { GetServerSideProps } from 'next';
import { getAccountMetadata, getTranslations, MetadataProps } from '@/blog/lib/get-translations';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      metadata: await getAccountMetadata((ctx.params?.param as string) ?? '', 'Followed Muted Lists by'),
      ...(await getTranslations(ctx))
    }
  };
};

export default function FollowedMutedList({ metadata }: { metadata: MetadataProps }) {
  const { username } = useSiteParams();
  const followedMuteQuery = useFollowListQuery(username, 'follow_muted');
  if (followedMuteQuery.isLoading) {
    return <div>Loading</div>;
  }
  return (
    <ProfileLists
      username={username}
      variant="followedMute"
      data={followedMuteQuery.data}
      metadata={metadata}
    />
  );
}
