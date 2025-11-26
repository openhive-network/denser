'use client';

import SubscriptionListItem from '@/blog/features/account-social/subscription-list-item';

const SubscriptionList = ({ data }: { data: string[][] | null | undefined }) => {
  return (
    <ul className="ml-4 list-disc py-8" data-testid="author-subscribed-communities-list">
      {data?.map((community: string[]) => <SubscriptionListItem community={community} key={community[0]} />)}
    </ul>
  );
};

export default SubscriptionList;
