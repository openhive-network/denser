import CommunitiesContent from './content';

// Non-async: communities data is already fetched by the parent ServerSideLayout
// and provided via InitialCommunitiesProvider context. Making this page synchronous
// avoids the loading.tsx Suspense skeleton during streaming SSR.
const CommunitiesPage = () => {
  return <CommunitiesContent />;
};

export default CommunitiesPage;
