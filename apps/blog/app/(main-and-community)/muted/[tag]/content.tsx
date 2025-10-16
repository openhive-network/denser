'use client';

import SortedPagesPosts from '@/blog/features/tags-pages/list-of-posts';

const sort = 'muted';

const Content = ({ tag }: { tag: string }) => {
  return <SortedPagesPosts sort={sort} tag={tag} />;
};

export default Content;
