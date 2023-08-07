import CommunitiesSidebar from '@/blog/components/communities-sidebar';
import { Input } from '@hive/ui/components/input';
import { useState, FocusEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCommunities } from '@/blog/lib/bridge';
import CommunitiesSelectFilter from '@/blog/components/communities-select-filter';
import CommunitiesList from '@/blog/components/communities-list';
import Loading from '@hive/ui/components/loading';
import Link from 'next/link';
import ExploreHive from '@/blog/components/explore-hive';

export default function CommunitiesPage() {
  const [sort, setSort] = useState('rank');
  const [query, setQuery] = useState<string>();
  const {
    isLoading: communitiesDataIsLoading,
    error: communitiesDataError,
    data: communitiesData
  } = useQuery(['communitiesList', sort, query], async () => await getCommunities(sort, query));

  function handleSearchCommunity(e: FocusEvent<HTMLInputElement>) {
    setQuery(e.target.value);
  }
  function handleChangeFilter(e: string) {
    setSort(e);
  }

  if (communitiesDataIsLoading) return <Loading loading={communitiesDataIsLoading} />;

  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2 pt-8">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-4 md:flex xl:col-span-2">
          <CommunitiesSidebar />
        </div>
        <div className="col-span-12 md:col-span-8">
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium">Communities</span>
            <Link className="text-sm font-medium text-red-600 dark:hover:text-red-800" href={'/'}>
              Create a Community
            </Link>
          </div>
          <div className="mt-4 flex items-center justify-between" translate="no">
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
        <div className="hidden lg:flex xl:col-span-2">
          <ExploreHive />
        </div>
      </div>
    </div>
  );
}
