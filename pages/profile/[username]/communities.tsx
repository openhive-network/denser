import Link from "next/link"

import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"
import SocialActivities from "@/components/social-activities"
import { SubscriptionList } from "@/components/subscription-list"

export default function UserCommunities() {
  const mockData = [
    {
      name: "BEER",
      link: "/trending/hive-1",
      role: "ADMIN",
    },
    {
      name: "carrot",
      link: "/trending/hive-2",
      role: "ADMIN",
    },
    {
      name: "HiveFest",
      link: "/trending/hive-3",
      role: "MOD",
    },
    {
      name: "LeoFinance",
      link: "/trending/hive-4",
      role: "GUEST",
    },
    {
      name: "Pinmapple",
      link: "/trending/hive-5",
      role: "GUEST",
    },
  ]
  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Community Subscriptions
      </h2>
      <p>The author has subscribed to the following Hive Communities</p>

      <SubscriptionList data={mockData} />

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

      <SocialActivities />
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
