import ListsPage from '@/blog/features/account-lists/lists-page';
import FollowedBlacklistContent from './content';

const type = 'follow_blacklist';

interface PageProps {
  params: {
    param: string;
  };
}
const FollowedBlacklistPage = ({ params }: PageProps) => {
  const { param } = params;

  return (
    <ListsPage username={param} type={type}>
      <FollowedBlacklistContent param={param} />
    </ListsPage>
  );
};
export default FollowedBlacklistPage;
