'use client'
import { SubscriptionListItem } from "@/components/subscription-list-item"

export function SubscriptionList({ data }) {
  return (
    <ul className="list-disc py-8 ml-4">
      {data.map((community) => (
        <SubscriptionListItem community={community} key={community.name}/>
      ))}
    </ul>
  )
}
