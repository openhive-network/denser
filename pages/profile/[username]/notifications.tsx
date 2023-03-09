import { Layout } from "@/components/layout"
import LayoutProfile from "@/components/layout-profile"
import NotificationActivities from "@/components/notification-activities"

export default function UserNotifications() {
  const mockData = [
    {
      username: "@wbrandt",
      action: "replies",
      timestamp: "2023-02-23T13:24:03",
    },
    {
      username: "@winniex",
      action: "replies",
      timestamp: "2023-02-23T13:24:03",
    },
    {
      username: "@drag33",
      action: "mention",
      timestamp: "2023-02-23T13:24:03",
    },
    {
      username: "@city-of-berlin",
      action: "mention",
      timestamp: "2023-02-23T13:24:03",
    },
    {
      username: "@wbrandt",
      action: "follow",
      timestamp: "2023-02-23T13:24:03",
    },
  ]
  return (
    <div className="flex flex-col">
      <div className="flex justify-center">
        <NotificationActivities data={mockData} />
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
