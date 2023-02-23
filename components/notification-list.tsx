"use client"

import { NotificationListItem } from "@/components/notification-list-item"

export function NotificationList({ data }) {
  return (
    <ul className="ml-4 py-8">
      {data.map((notification, index) => (
        <NotificationListItem
          key={notification.username + index}
          username={notification.username}
          action={notification.action}
          timestamp={notification.timestamp}
        />
      ))}
    </ul>
  )
}
