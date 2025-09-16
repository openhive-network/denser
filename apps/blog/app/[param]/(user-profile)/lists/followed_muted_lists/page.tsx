import ListsPage from '@/blog/features/account-lists/lists-page';
import FollowedMutedListsContent from './content';

const type = 'followed_muted_lists';

interface PageProps {
  params: {
    param: string;
  };
}
const FollowedMutedListsPage = ({ params }: PageProps) => {
  const { param } = params;

  return (
    <ListsPage username={param} type={type}>
      <FollowedMutedListsContent param={param} />
    </ListsPage>
  );
};
export default FollowedMutedListsPage;
