import { SortTypes } from '@/blog/lib/utils';
import { ReactNode } from 'react';

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
  return <>{children}</>;
};

export default SortPage;
