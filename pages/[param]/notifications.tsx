import { useRouter } from "next/router"
import { QueryClient, dehydrate } from "@tanstack/react-query"

import { getAccountNotifications } from "@/lib/bridge"
import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"
import NotificationActivities from "@/components/notification-activities"
import { useAccountNotifications } from '@/services/bridgeService';

export default function UserNotifications() {
  const router = useRouter()
  const username =
    typeof router.query?.param === "string" ? router.query.param : ""
  const { isLoading, error, data } = useAccountNotifications(username.slice(1));

  if (isLoading) return <p>Loading... ⚡️</p>

  return (
    <div className="flex flex-col">
      <div className="flex justify-center">
        <NotificationActivities data={data} />
      </div>
    </div>
  )
}

UserNotifications.getLayout = function getLayout(page) {
  return (
    <Layout>
      <LayoutProfile>{page}</LayoutProfile>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  const username = String(context.params?.param).slice(1);
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery(["accountNotification", username], () =>
    getAccountNotifications(username)
  )

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}
