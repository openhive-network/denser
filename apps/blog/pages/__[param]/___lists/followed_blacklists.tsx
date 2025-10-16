import { useSiteParams } from '@ui/components/hooks/use-site-params';
import ProfileLists from '@/blog/components/profile-lists-component';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { GetServerSideProps } from 'next';
import { getAccountMetadata, getTranslations, MetadataProps } from '@/blog/lib/get-translations';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      metadata: await getAccountMetadata((ctx.params?.param as string) ?? '', 'Followed Blacklists by'),
      ...(await getTranslations(ctx))
    }
  };
};

export default function FollowedBlacklist({ metadata }: { metadata: MetadataProps }) {
  const { username } = useSiteParams();
  const followedBlacklistQuery = useFollowListQuery(username, 'follow_blacklist');
  if (followedBlacklistQuery.isLoading) {
    return <div>Loading</div>;
  }
  return (
    <ProfileLists
      username={username}
      variant="followedBlacklist"
      data={followedBlacklistQuery.data}
      metadata={metadata}
    />
  );
}
