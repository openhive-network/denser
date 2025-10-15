import Content from './content';
import SortPage from '@/blog/features/sorts-pages/sort-page';

const sort = 'muted';

const Page = () => (
  <SortPage sort={sort}>
    <Content />
  </SortPage>
);

export default Page;
