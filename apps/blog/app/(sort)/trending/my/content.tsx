'use client';

import SortedPagesPosts from '@/blog/features/sorts-pages/posts-list';

const sort = 'trending';
const tag = 'my';

const Content = () => <SortedPagesPosts sort={sort} tag={tag} />;

export default Content;
