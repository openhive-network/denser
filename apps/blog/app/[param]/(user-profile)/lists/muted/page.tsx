import ListsPage from '@/blog/features/account-lists/lists-page';
import MutedContent from './content';

const type = 'muted';

interface PageProps {
  params: Promise<{
    param: string;
  }>;
}
const MutedPage = async ({ params }: PageProps) => {
  const { param } = await params;

  return (
    <ListsPage username={param} type={type}>
      <MutedContent param={param} />
    </ListsPage>
  );
};
export default MutedPage;
