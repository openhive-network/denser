import SortPage from '@/blog/features/community-pages/sort-page';
import Content from './content';

interface PageProps {
  params: {
    tag: string;
  };
}

const sort = 'payout';

const Page = ({ params }: PageProps) => {
  const { tag } = params;

  return (
    <SortPage sort={sort} tag={tag}>
      <Content tag={tag} />
    </SortPage>
  );
};
export default Page;
