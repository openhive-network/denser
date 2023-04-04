import { SubscriptionListItem } from "@/components/subscription-list-item"

export function SubscriptionList({ data }) {
  return (
    <ul className="ml-4 list-disc py-8">
      {data.map((community) => (
        <SubscriptionListItem community={community} key={community[0]}/>
      ))}
    </ul>
  )
}
