'use client';

import SortedPagesPosts from '@/blog/features/tags-pages/list-of-posts';

const sort = 'created';
const tag = 'my';

const Content = () => <SortedPagesPosts sort={sort} tag={tag} />;

export default Content;
