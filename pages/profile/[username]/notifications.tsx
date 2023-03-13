import { useRouter } from "next/router"
import { QueryClient, dehydrate, useQuery } from "@tanstack/react-query"

import { getAccountNotifications } from "@/lib/bridge"
import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"
import NotificationActivities from "@/components/notification-activities"

export default function UserNotifications() {
  const router = useRouter()
  const username =
    typeof router.query?.username === "string" ? router.query.username : ""
  const { isLoading, error, data } = useQuery({
    queryKey: ["accountNotification", username],
    queryFn: () => getAccountNotifications(username),
  })

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
  const username = context.params?.username as string
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
