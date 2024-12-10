'use client';

import CommunitiesMybar from '@/blog/components/communities-mybar';
import CommunitiesSidebar from '@/blog/components/communities-sidebar';
import CommunityDescription from '@/blog/components/community-description';
import CommunitySimpleDescription from '@/blog/components/community-simple-description';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useQuery } from '@tanstack/react-query';
import { getAccountNotifications, getCommunity, getSubscribers } from '@transaction/lib/bridge';
import { useParams } from 'next/navigation';
import Content from './content';
import Loading from '@ui/components/loading';

const Page = () => {
  const { user } = useUserClient();
  const { param, param2: communityTag } = useParams() as { param: string; param2: string };
  const { data: communityData, isLoading: communityIsLoading } = useQuery(
    ['community', communityTag, ''],
    () => getCommunity(communityTag, user.username),
    {
      enabled: !!communityTag
    }
  );
  const { data: activitiesData, isLoading: activitiesIsLoading } = useQuery(
    ['AccountNotification', communityTag],
    () => getAccountNotifications(communityTag),
    {
      enabled: !!communityTag
    }
  );
  const { data: subsData } = useQuery(['subscribers', communityData], () => getSubscribers(communityTag), {
    enabled: !!communityTag
  });

  if (communityIsLoading || activitiesIsLoading || !communityData || !subsData) {
    return <Loading loading={communityIsLoading || activitiesIsLoading} />;
  }

  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {user?.isLoggedIn ? <CommunitiesMybar username={user.username} /> : <CommunitiesSidebar />}{' '}
        </div>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
          <div data-testid="card-explore-hive-mobile" className=" md:col-span-10 md:flex xl:hidden">
            <CommunitySimpleDescription
              data={communityData}
              subs={subsData}
              username={communityTag}
              notificationData={activitiesData}
            />
          </div>
          <Content communityTag={communityTag} communityData={communityData} sort={param} />
        </div>
        <div data-testid="card-explore-hive-desktop" className="hidden xl:col-span-2 xl:flex">
          <CommunityDescription
            data={communityData}
            subs={subsData}
            notificationData={activitiesData}
            username={communityTag}
          />
        </div>
      </div>
    </div>
  );
};
export default Page;
