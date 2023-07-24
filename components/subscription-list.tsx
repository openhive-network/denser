import SubscriptionListItem from '@/components/subscription-list-item';
import { Subscription } from '@/lib/bridge';

const SubscriptionList = ({ data }: { data: Subscription[] | null | undefined }) => {
  return (
    <ul className="ml-4 list-disc py-8">
      {data?.map((community: string[]) => (
        <SubscriptionListItem community={community} key={community[0]} />
      ))}
    </ul>
  );
};

export default SubscriptionList;
