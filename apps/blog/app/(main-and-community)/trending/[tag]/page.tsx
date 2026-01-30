import SortPage from '@/blog/features/community-profile/sort-page';
import Content from './content';

interface PageProps {
  params: Promise<{
    tag: string;
  }>;
}

const sort = 'trending';

const Page = async ({ params }: PageProps) => {
  const { tag } = await params;

  return (
    <SortPage sort={sort} tag={tag}>
      <Content tag={tag} />
    </SortPage>
  );
};
export default Page;
