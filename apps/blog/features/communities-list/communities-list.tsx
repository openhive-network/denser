'use client';

import { useState } from 'react';
import CommunitiesListItem from '@/blog/features/communities-list/communities-list-item';
import DialogLogin from '@/blog/components/dialog-login';
import { Community } from '@hive/common-hiveio-packages/wax';
import { useTranslation } from '@/blog/i18n/client';
import { useCommunitiesSubscription, type CommunitySubscriptionState } from './use-communities-subscription';

const CommunitiesList = ({
  data,
  userSubscriptions
}: {
  data: Community[] | null | undefined;
  userSubscriptions?: string[][] | null;
}) => {
  const { t } = useTranslation('common_blog');
  const { needsLogin, stateOf, toggle } = useCommunitiesSubscription(userSubscriptions);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const onSubscribeClick = (community: Community, state: CommunitySubscriptionState) => {
    if (needsLogin) setIsLoginOpen(true);
    else void toggle(community, state);
  };

  return (
    <>
      <ul>
        {data?.map((community: Community) => (
          <CommunitiesListItem
            community={community}
            key={community.name}
            t={t}
            subscription={stateOf(community)}
            onSubscribeClick={onSubscribeClick}
          />
        ))}
      </ul>
      {needsLogin ? <DialogLogin open={isLoginOpen} onOpenChange={setIsLoginOpen} /> : null}
    </>
  );
};

export default CommunitiesList;
