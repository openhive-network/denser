import ListsPage from '@/blog/features/account-lists/lists-page';
import BlacklistedUsersContent from './content';

const type = 'blacklisted';

interface PageProps {
  params: {
    param: string;
  };
}
const BlacklistedUsersPage = ({ params }: PageProps) => {
  const { param } = params;

  return (
    <ListsPage username={param} type={type}>
      <BlacklistedUsersContent param={param} />
    </ListsPage>
  );
};
export default BlacklistedUsersPage;
