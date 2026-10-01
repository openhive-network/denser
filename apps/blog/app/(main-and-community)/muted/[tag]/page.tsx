import SortPage from '@/blog/features/community-profile/sort-page';
import Content from './content';

interface PageProps {
  params: Promise<{
    tag: string;
  }>;
}
const sort = 'muted';

const Page = async (props: PageProps) => {
  const params = await props.params;
  const { tag } = params;

  return (
    <SortPage sort={sort} tag={tag}>
      <Content tag={tag} />
    </SortPage>
  );
};
export default Page;
