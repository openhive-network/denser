import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import {
  useGetAccountFull,
  useGetAccounts,
  useGetDynamicGlobalProperties,
} from "@/services/hiveService"
import { QueryClient, dehydrate } from "@tanstack/react-query"

import {
  getAccountFull,
  getAccounts,
  getDynamicGlobalProperties,
} from "@/lib/hive"
import { accountReputation, getHivePower, numberWithCommas } from "@/lib/utils"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"

const Time = dynamic(() => import("./time"), {
  ssr: false,
})

const Date = dynamic(() => import("./date"), {
  ssr: false,
})

export default function ProfileInfo({ handleCoverImage }) {
  const [profile, setProfile] = useState(undefined)
  const [hivePower, setHivePower] = useState(0)
  const router = useRouter()
  const username =
    typeof router.query?.param === "object"
      ? router.query.param[0]
      : typeof router.query?.param === "string"
      ? router.query?.param
      : ""
  const { isLoading, error, data } = useGetAccountFull(
    username.slice(1),
    username.startsWith("@")
  )
  const {
    isLoading: accountDataIsLoading,
    error: accountDataError,
    data: accountData,
  } = useGetAccounts(username.slice(1), username.startsWith("@"))

  const {
    isLoading: dynamicGlobalDataIsLoading,
    error: dynamicGlobalDataError,
    data: dynamicGlobalData,
  } = useGetDynamicGlobalProperties()

  useEffect(() => {
    if (!dynamicGlobalDataIsLoading && !accountDataIsLoading) {
      setHivePower(
        getHivePower(
          dynamicGlobalData?.total_vesting_fund_hive.split(" ")[0],
          dynamicGlobalData?.total_vesting_shares.split(" ")[0],
          accountData[0].vesting_shares.split(" ")[0],
          accountData[0].delegated_vesting_shares.split(" ")[0],
          accountData[0].received_vesting_shares.split(" ")[0]
        )
      )
    }
  }, [dynamicGlobalDataIsLoading, accountDataIsLoading])

  useEffect(() => {
    if (!isLoading) {
      handleCoverImage(
        JSON.parse(data?.posting_json_metadata).profile.cover_image
          ? JSON.parse(data?.posting_json_metadata).profile.cover_image
          : ""
      )
    }
  }, [isLoading, data, handleCoverImage])

  useEffect(() => {
    if (!accountDataIsLoading && data) {
      setProfile(JSON.parse(data.posting_json_metadata).profile)
    }
  }, [accountDataIsLoading, data])

  if (isLoading || accountDataIsLoading || dynamicGlobalDataIsLoading)
    return <p>Loading... ⚡️</p>

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
          src={profile?.profile_image}
          alt="Profile picture"
        />
      </div>
      <h4 className="mt-8 mb-4 text-xl text-slate-900 dark:text-white">
        {data.profile.name}{" "}
        <span className="text-slate-600">
          ({accountReputation(data.reputation)})
        </span>
      </h4>
      <h6 className="my-4 bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
        @{data.name}
      </h6>
      <p className="my-4">{profile?.about}</p>
      <p className="my-4 flex text-slate-900 dark:text-white">
        <Icons.calendarActive className="mr-2" />
        Active <Time time={data.last_vote_time} />
      </p>
      <p className="my-4 flex text-slate-900 dark:text-white">
        <Icons.calendarHeart className="mr-2" />
        Joined <Date time={data.created} />
      </p>
      <p className="my-4 flex text-slate-900 dark:text-white">
        <Icons.mapPin className="mr-2" />
        {data.profile.location}
      </p>

      <div className="my-4 grid grid-cols-2 gap-y-4">
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">
            {data.post_count}
          </span>
          Number of posts
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">
            {numberWithCommas(hivePower)}
          </span>
          HP
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">
            {data.follow_stats.following_count}
          </span>
          Following
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">
            {data.follow_stats.follower_count}
          </span>
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
        {data.profile.website ? (
          <p className="my-3 flex flex-wrap">
            <Icons.globe2 className="mr-2" />
            <Link
              target="_external"
              className="website-link"
              href={`https://${data.profile.website.replace(
                /^(https?|ftp):\/\//,
                ""
              )}`}
            >
              <span className="text-slate-900 dark:text-white">
                {data.profile.website}
              </span>
            </Link>
          </p>
        ) : null}
        {/*<p className="my-3 flex">*/}
        {/*  <Icons.twitter className="mr-2" />*/}
        {/*  <Link href="/">*/}
        {/*    <span className="text-slate-900 dark:text-white">olive123y</span>*/}
        {/*  </Link>*/}
        {/*</p>*/}
        {/*<p className="my-3 flex">*/}
        {/*  <Icons.instagram className="mr-2" />*/}
        {/*  <Link href="/">*/}
        {/*    <span className="text-slate-900 dark:text-white">olivephotos</span>*/}
        {/*  </Link>*/}
        {/*</p>*/}
      </div>
    </div>
  )
}

export async function getServerSideProps(context) {
  const username = context.params?.username as string
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(["profileData", username], () =>
    getAccountFull(username)
  )

  await queryClient.prefetchQuery(["accountData", username], () =>
    getAccounts([username])
  )

  await queryClient.prefetchQuery(["dynamicGlobalData", username], () =>
    getDynamicGlobalProperties()
  )

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
