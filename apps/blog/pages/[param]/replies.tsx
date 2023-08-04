import ProfileLayout from '@/blog/components/common/profile-layout';
import { useSiteParams } from '@/blog/components/hooks/use-site-params';
import { getAccountPosts } from '@/blog/lib/bridge';
import { useQuery } from '@tanstack/react-query';
import RepliesList from '@/blog/components/replies-list';

export default function UserReplies() {
  const { username } = useSiteParams();
  const { isLoading, error, data } = useQuery(
    ['accountReplies', username, 'replies'],
    () => getAccountPosts('replies', username, 'hive.blog'),
    { enabled: !!username }
  );

  if (isLoading) return <p>Loading...</p>;

  return (
    <ProfileLayout>
      <div className="flex flex-col">
        <RepliesList data={data} />
      </div>
    </ProfileLayout>
  );
}
