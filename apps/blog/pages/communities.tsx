import CommunitiesSidebar from "@/blog/components/communities-sidebar";
import { Input } from "@hive/ui/components/input";
import { useState, KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCommunities } from "@/blog/lib/bridge";
import CommunitiesSelectFilter from "@/blog/components/communities-select-filter";
import CommunitiesList from "@/blog/components/communities-list";
import Loading from "@hive/ui/components/loading";
import ExploreHive from "@/blog/components/explore-hive";
import { Icons } from "@hive/ui/components/icons";
import { Separator } from "@ui/components";

export default function CommunitiesPage() {
  const [sort, setSort] = useState("rank");
  const [inputQuery, setInputQuery] = useState<string>("");
  const [query, setQuery] = useState<string | null>();
  const {
    isLoading: communitiesDataIsLoading,
    error: communitiesDataError,
    data: communitiesData,
  } = useQuery(
    ["communitiesList", sort, query],
    async () => await getCommunities(sort, query)
  );

  function handleSearchCommunity(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      inputQuery !== "" ? setQuery(inputQuery) : setQuery(null);
    }
  }
  function handleChangeFilter(e: string) {
    setSort(e);
  }

  if (communitiesDataIsLoading)
    return <Loading loading={communitiesDataIsLoading} />;

  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2 pt-8">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-4 md:flex xl:col-span-2">
          <CommunitiesSidebar />
        </div>
        <div className="col-span-12 md:col-span-8">
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium sm:text-xl">Communities</span>
            {/* <Link className="text-sm font-medium text-red-600 dark:hover:text-red-800" href={'/'}>
              Create a Community
            </Link> */}
          </div>
          <div
            className="mt-4 flex items-center justify-between w-full gap-4"
            translate="no"
          >
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Icons.search className="h-5 w-5 rotate-90" />
              </div>
              <Input
                type="search"
                id="search"
                value={inputQuery}
                placeholder="Search..."
                autoComplete="off"
                className="bg-white dark:bg-background/95 dark:text-white block p-4 pl-10 text-sm rounded-full"
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => handleSearchCommunity(e)}
              />
            </div>
            <CommunitiesSelectFilter
              filter={sort}
              handleChangeFilter={handleChangeFilter}
            />
          </div>
          <Separator className="my-4" />
          {communitiesData && communitiesData?.length > 0 ? (
            <CommunitiesList data={communitiesData} />
          ) : (
            <div className="w-full py-4">No results for your search</div>
          )}
        </div>
        <div className="hidden lg:flex xl:col-span-2">
          <ExploreHive />
        </div>
      </div>
    </div>
  );
}
