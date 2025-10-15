import Content from './content';
import SortPage from '@/blog/features/sorts-pages/sort-page';

const sort = 'muted';
const tag = 'my';

const Page = () => (
  <SortPage sort={sort} tag={tag}>
    <Content />
  </SortPage>
);

export default Page;
