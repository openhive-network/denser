'use client';

import SortedPagesPosts from '@/blog/features/list-of-posts/list-of-posts';

const sort = 'created';

const Content = ({ tag }: { tag: string }) => {
  return <SortedPagesPosts sort={sort} tag={tag} />;
};

export default Content;
