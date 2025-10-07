'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { getPostsRanked } from '@transaction/lib/bridge-api';
import { DEFAULT_OBSERVER, SortTypes } from './lib/utils';
import { useUser } from '@smart-signer/lib/auth/use-user';

const SortedPagesPosts = ({ sort }: { sort: SortTypes }) => {
  const { user } = useUser();

  return <div>Posts Sort Page</div>;
};
export default SortedPagesPosts;
