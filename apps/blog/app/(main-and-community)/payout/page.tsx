import Content from './content';
import SortPage from '@/blog/features/tags-pages/sort-page';

const sort = 'payout';

const Page = () => (
  <SortPage sort={sort}>
    <Content />
  </SortPage>
);

export default Page;
