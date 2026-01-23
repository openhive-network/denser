import { Suspense } from 'react';
import { SortTypes } from '@/blog/lib/utils';
import { ReactNode } from 'react';
import Loading from '@ui/components/loading';

// No server-side prefetch for observer-dependent queries to avoid hydration mismatch
// Client will fetch with correct observer after mount
const SortPage = ({
  children,
  sort,
  tag = ''
}: {
  children: ReactNode;
  sort: SortTypes;
  tag?: string;
}) => {
  return <Suspense fallback={<Loading loading={true} />}>{children}</Suspense>;
};

export default SortPage;
