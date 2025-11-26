import ListsPage from '@/blog/features/account-lists/lists-page';
import MutedContent from './content';

const type = 'muted';

interface PageProps {
  params: {
    param: string;
  };
}
const MutedPage = ({ params }: PageProps) => {
  const { param } = params;

  return (
    <ListsPage username={param} type={type}>
      <MutedContent param={param} />
    </ListsPage>
  );
};
export default MutedPage;
