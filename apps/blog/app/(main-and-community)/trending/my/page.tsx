import SortPage from '@/blog/features/tags-pages/sort-page';
import Content from './content';

const sort = 'trending';
const tag = 'my';

const Page = () => (
  <SortPage sort={sort} tag={tag}>
    <Content />
  </SortPage>
);

export default Page;
