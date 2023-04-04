import { NotificationListItem } from "@/components/notification-list-item"

export function NotificationList({ data }) {
  return (
    <ul className="ml-4 py-8">
      {data.map((notification, index) => (
        <NotificationListItem
          key={`${notification.id}-${notification.type}`}
          date={notification.date}
          msg={notification.msg}
          score={notification.score}
          type={notification.type}
          url={notification.url}
        />
      ))}
    </ul>
  )
}
