import Link from "next/link"
import { useRouter } from "next/router"
import { useGetSubscriptions } from "@/services/bridgeService"
import { QueryClient, dehydrate } from "@tanstack/react-query"

import { getSubscriptions } from "@/lib/bridge"
import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"
import SocialActivities from "@/components/social-activities"
import { SubscriptionList } from "@/components/subscription-list"
import * as console from "console";

export default function UserCommunities({ hivebuzz, peakd }) {
  const router = useRouter()
  const username =
    typeof router.query?.param === "string" ? router.query.param : ""
  const { isLoading, error, data } = useGetSubscriptions(username.slice(1))

  if (isLoading) return <p>Loading... ⚡️</p>

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Community Subscriptions
      </h2>
      <p>The author has subscribed to the following Hive Communities</p>

      <SubscriptionList data={data} />

      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Badges and achievements
      </h2>
      <p>
        These are badges received by the author via the third-party apps{" "}
        <Link
          href="https://peakd.com/"
          className="text-red-600 hover:underline"
        >
          Peakd
        </Link>{" "}
        &{" "}
        <Link
          href="https://hivebuzz.me/"
          className="text-red-600 hover:underline"
        >
          Hivebuzz
        </Link>
        .
      </p>

      <SocialActivities data={hivebuzz} peakd={peakd}/>
    </div>
  )
}

UserCommunities.getLayout = function getLayout(page) {
  return (
    <Layout>
      <LayoutProfile>{page}</LayoutProfile>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const username = String(context.params?.param).slice(1);
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(["listAllSubscription", username], () =>
    getSubscriptions(username)
  )

  const hivebuzzRes = await fetch(`https://hivebuzz.me/api/badges/${username}`)
  console.log('hivebuzzRes', hivebuzzRes)
  const hivebuzzJson = await hivebuzzRes.json()
  const hivebuzzJsonStateOn = hivebuzzJson.filter(
    (badge) => badge.state === "on"
  )

  const peakdRes = await fetch(`https://peakd.com/api/public/badge/${username}`)
  const peakdJson = await peakdRes.json();
  const peakdJsonMapedWithURL = peakdJson.map(obj => ({ id: obj.title ,url: `https://images.hive.blog/u/${obj.name}/avatar`, title: obj.title}))

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      hivebuzz: hivebuzzJsonStateOn,
      peakd: peakdJsonMapedWithURL
    },
  }
}
