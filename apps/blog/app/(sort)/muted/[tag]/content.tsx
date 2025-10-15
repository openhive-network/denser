'use client';

import SortedPagesPosts from '@/blog/features/sorts-pages/posts-list';

const sort = 'muted';

const Content = ({ tag }: { tag: string }) => {
  return <SortedPagesPosts sort={sort} tag={tag} />;
};

export default Content;
