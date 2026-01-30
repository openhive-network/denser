import ListsPage from '@/blog/features/account-lists/lists-page';
import FollowedMutedListsContent from './content';

const type = 'followed_muted_lists';

interface PageProps {
  params: Promise<{
    param: string;
  }>;
}
const FollowedMutedListsPage = async ({ params }: PageProps) => {
  const { param } = await params;

  return (
    <ListsPage username={param} type={type}>
      <FollowedMutedListsContent param={param} />
    </ListsPage>
  );
};
export default FollowedMutedListsPage;
