import { useState } from "react"
import { useGetCommunities } from "@/services/bridgeService"

import CommunitiesList from "@/components/communities-list"
import CommunitiesSelectFilter from "@/components/communities-select-filter"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CommunitiesProvider() {
  const [sort, setSort] = useState("rank")
  const [query, setQuery] = useState(null)
  const { isLoading, error, data } = useGetCommunities(sort, query)

  function handleSearchCommunity(e) {
    setQuery(e.target.value)
  }
  function handleChangeFilter(e) {
    setSort(e)
  }

  if (isLoading) return <p>Loading...</p>

  return (
    <>
      <div className="flex flex-col justify-between md:flex-row">
        <div className="relative mb-4 text-gray-600 focus-within:text-gray-400 md:mb-8">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2">
            <Icons.search className="h-5 w-5" />
          </span>
          <Input
            type="search"
            id="search"
            placeholder="Search communities"
            autoComplete="off"
            className="pl-10"
            onBlur={handleSearchCommunity}
          />
        </div>
        <div className="flex gap-4">
          <CommunitiesSelectFilter
            filter={sort}
            handleChangeFilter={handleChangeFilter}
          />
          <Button className="border-red-600 bg-red-500 text-base text-white hover:bg-red-600 hover:text-white dark:border-red-600 dark:bg-red-500 dark:text-white dark:hover:bg-red-600 dark:hover:text-white">
            Create a Community
          </Button>
        </div>
      </div>
      {data.length > 0 ? (
        <CommunitiesList data={data} />
      ) : (
        <p>No results for your search</p>
      )}
    </>
  )
}
