import Link from "next/link"
import { useGetCommunities } from "@/services/bridgeService"
import { Button } from "@/components/ui/button"

export default function CommunitiesSidebar() {
  const { isLoading, error, data } = useGetCommunities()

  if (isLoading) return <p>Loading...</p>

  return (
    <div className="hidden w-72 flex-col px-8 md:flex">
      <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
        Trending Communities
      </h2>
      <ul className="space-y-1">
        {data?.slice(0, 12).map((community) => (
          <li key={community.id}>
            <Link href={`/trending/${community.name}`}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                {community.title}
              </Button>
            </Link>
          </li>
        ))}
        <li>
          <Link href={`/communities`}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Explore communities...
            </Button>
          </Link>
        </li>
      </ul>
    </div>
  )
}
