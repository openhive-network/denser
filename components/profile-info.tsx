import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import { QueryClient, dehydrate, useQuery } from "@tanstack/react-query"

import { getAccount } from "@/lib/hive"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { accountReputation } from '@/lib/utils';

export default function ProfileInfo() {
  const router = useRouter()
  const username =
    typeof router.query?.username === "string" ? router.query.username : ""
  const { isLoading, error, data } = useQuery({
    queryKey: ["profileData", username],
    queryFn: () => getAccount(username),
  })

  if (isLoading) return <p>Loading... ⚡️</p>

  console.log('data', data)

  const profile = JSON.parse(data.posting_json_metadata).profile

  return (
    <div className="mt-[-6rem] px-8 md:w-80 ">
      <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-white dark:bg-slate-900">
        {/*<Image*/}
        {/*  src={profile.profile_image}*/}
        {/*  alt="Profile picture"*/}
        {/*  className="h-36 w-36 rounded-md"*/}
        {/*  height="144"*/}
        {/*  width="144"*/}
        {/*  priority*/}
        {/*/>*/}
        <img
          className="h-36 w-36 rounded-md"
          src={profile.profile_image}
          alt="Profile picture"
        />
      </div>
      <h4 className="mt-8 mb-4 text-xl text-slate-900 dark:text-white">
        {data.profile.name} <span className="text-slate-600">({accountReputation(data.reputation)})</span>
      </h4>
      <h6 className="my-4 bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
        @{data.name}
      </h6>
      <p className="my-4">{profile.about}</p>
      <p className="my-4 flex text-slate-900 dark:text-white">
        <Icons.calendarHeart className="mr-2" />
        Joined August 26, 2018
      </p>
      <p className="my-4 flex text-slate-900 dark:text-white">
        <Icons.mapPin className="mr-2" />
        {data.profile.location}
      </p>

      <div className="my-4 grid grid-cols-2 gap-y-4">
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">{data.post_count}</span>
          Number of posts
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">1,676</span>
          HP
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">293</span>
          Following
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">109</span>
          Followers
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
      >
        <Icons.userPlus className="mr-2" />
        Follow
      </Button>

      <div>
        <h6 className="text-slate-900 dark:text-white">Links</h6>
        <p className="my-3 flex">
          <Icons.globe2 className="mr-2" />
          <Link href="/">
            <span className="text-slate-900 dark:text-white">
              www.olivia.com
            </span>
          </Link>
        </p>
        <p className="my-3 flex">
          <Icons.twitter className="mr-2" />
          <Link href="/">
            <span className="text-slate-900 dark:text-white">olive123y</span>
          </Link>
        </p>
        <p className="my-3 flex">
          <Icons.instagram className="mr-2" />
          <Link href="/">
            <span className="text-slate-900 dark:text-white">olivephotos</span>
          </Link>
        </p>
      </div>
    </div>
  )
}

export async function getServerSideProps(context) {
  const username = context.params?.username as string
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(["profileData", username], () =>
    getAccount(username)
  )

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
