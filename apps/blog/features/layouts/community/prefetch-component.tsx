import { ReactNode } from 'react';
import CommunityLayout from './community-layout';

// No server-side prefetch for observer-dependent queries to avoid hydration mismatch
// Client will fetch communitiesList and community data with correct observer after mount
const PrefetchComponent = ({ children, community }: { children: ReactNode; community: string }) => {
  return <CommunityLayout community={community}>{children}</CommunityLayout>;
};

export default PrefetchComponent;
