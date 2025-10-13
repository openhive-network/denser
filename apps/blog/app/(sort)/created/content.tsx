'use client';

import SortedPagesPosts from '@/blog/features/sorts-pages/posts-list';

const Content = () => {
  const sort = 'created';
  return <SortedPagesPosts sort={sort} />;
};
export default Content;
