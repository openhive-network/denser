import CommunitiesContent from './content';

// No server-side prefetch for observer-dependent queries to avoid hydration mismatch
// Client will fetch with correct observer after mount
const CommunitiesPage = () => {
  return <CommunitiesContent />;
};

export default CommunitiesPage;
