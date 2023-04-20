import CommunitiesSidebar from '@/components/communities-sidebar';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCommunities } from '@/lib/bridge';
import CommunitiesSelectFilter from '@/components/communities-select-filter';
import CommunitiesList from '@/components/communities-list';
import Loading from '@/components/loading';
import Link from 'next/link';

export default function CommunitiesPage() {
  const [sort, setSort] = useState('rank');
  const [query, setQuery] = useState(null);
  const {
    isLoading: communitiesDataIsLoading,
    error: communitiesDataError,
    data: communitiesData
  } = useQuery(['communitiesList', sort, query], async () => await getCommunities(sort, query));

  function handleSearchCommunity(e: any) {
    setQuery(e.target.value);
  }
  function handleChangeFilter(e: any) {
    setSort(e);
  }

  if (communitiesDataIsLoading) return <Loading />;

  return (
    <div className="container mx-auto max-w-screen-xl flex-grow px-4 pb-2 pt-8">
      <div className="grid grid-cols-12 lg:gap-8 ">
        <div className="col-span-12 mb-5 space-y-5 md:col-span-12 lg:col-span-8">
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium">Communities</span>
            <Link className="text-sm font-medium text-red-600 dark:hover:text-red-800" href={'/'}>
              Create a Community
            </Link>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Input
              type="search"
              id="search"
              placeholder="Search..."
              autoComplete="off"
              className="w-60 bg-white dark:bg-background/95 dark:text-white"
              onBlur={handleSearchCommunity}
            />
            <CommunitiesSelectFilter filter={sort} handleChangeFilter={handleChangeFilter} />
          </div>
          <CommunitiesList data={communitiesData} />
        </div>
        <div className="col-span-12 md:col-span-12 lg:col-span-4">
          <CommunitiesSidebar />
        </div>
      </div>
    </div>
  );
}
