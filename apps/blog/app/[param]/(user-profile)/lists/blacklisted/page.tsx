import ListsPage from '@/blog/features/account-lists/lists-page';
import BlacklistedUsersContent from './content';

const type = 'blacklisted';

interface PageProps {
  params: Promise<{
    param: string;
  }>;
}
const BlacklistedUsersPage = async ({ params }: PageProps) => {
  const { param } = await params;

  return (
    <ListsPage username={param} type={type}>
      <BlacklistedUsersContent param={param} />
    </ListsPage>
  );
};
export default BlacklistedUsersPage;
