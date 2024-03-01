import SubscriptionListItem from '@/blog/components/subscription-list-item';
import type { Subscription } from '@transaction/lib/bridge';

const SubscriptionList = ({ data }: { data: Subscription[] | null | undefined }) => {
  return (
    <ul className="ml-4 list-disc py-8" data-testid="author-subscribed-communities-list">
      {data?.map((community: string[]) => <SubscriptionListItem community={community} key={community[0]} />)}
    </ul>
  );
};

export default SubscriptionList;
