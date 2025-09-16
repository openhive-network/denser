'use client';

import SortedPagesPosts from '@/blog/features/tags-pages/list-of-posts';

const sort = 'hot';
const tag = 'my';

const Content = () => <SortedPagesPosts sort={sort} tag={tag} />;

export default Content;
