import { ReactNode } from 'react';

// No server-side prefetch for observer-dependent queries to avoid hydration mismatch
// Client will fetch communitiesList and subscriptions with correct observer after mount
const ServerSideLayout = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export default ServerSideLayout;
