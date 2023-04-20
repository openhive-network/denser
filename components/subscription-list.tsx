import SubscriptionListItem from "@/components/subscription-list-item"

const SubscriptionList = ({ data }: { data: any}) => {
  return (
    <ul className="ml-4 list-disc py-8">
      {data?.map((community: any) => (
        <SubscriptionListItem community={community} key={community[0]}/>
      ))}
    </ul>
  )
}

export default SubscriptionList;
