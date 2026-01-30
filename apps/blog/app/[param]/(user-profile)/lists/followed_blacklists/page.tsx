import ListsPage from '@/blog/features/account-lists/lists-page';
import FollowedBlacklistContent from './content';

const type = 'follow_blacklist';

interface PageProps {
  params: Promise<{
    param: string;
  }>;
}
const FollowedBlacklistPage = async ({ params }: PageProps) => {
  const { param } = await params;

  return (
    <ListsPage username={param} type={type}>
      <FollowedBlacklistContent param={param} />
    </ListsPage>
  );
};
export default FollowedBlacklistPage;
