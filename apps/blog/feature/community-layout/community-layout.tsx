import { ReactNode } from 'react';
import CommunitySimpleDescription from './community-simple-description';
import CommunitiesMybar from '../../components/communities-mybar';
import CommunitiesSidebar from '../../components/communities-sidebar';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@smart-signer/lib/auth/use-user';
import {
  getAccountNotifications,
  getCommunity,
  getSubscribers,
  getSubscriptions
} from '@transaction/lib/bridge';
import CommunityDescription from './community-description';
import SimpleDescriptionSkeleton from '@/blog/feature/community-layout/simple-description-skeleton';
import DescriptionSkeleton from './descripton-skeleton';
import ExploreHive from '@/blog/components/explore-hive';

const CommunityLayout = ({ children, community }: { children: ReactNode; community: string }) => {
  const { user } = useUser();

  const { data: mySubsData } = useQuery(
    ['subscriptions', user?.username],
    () => getSubscriptions(user.username),
    {
      enabled: Boolean(user?.username)
    }
  );

  const { data: communityData, isLoading: communityDataIsLoading } = useQuery(
    ['community', community],
    () => getCommunity(community, user.username),
    { enabled: !!community }
  );

  const { data: subsData, isLoading: subsIsLoading } = useQuery(
    ['subscribers', community],
    () => getSubscribers(community),
    { enabled: !!community }
  );

  const { data: notificationData } = useQuery(
    ['AccountNotification', community],
    () => getAccountNotifications(community),
    { enabled: !!community }
  );
  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {user?.isLoggedIn ? (
            <CommunitiesMybar data={mySubsData} username={user.username} />
          ) : (
            <CommunitiesSidebar />
          )}
        </div>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
          <div data-testid="card-explore-hive-mobile" className="md:col-span-10 md:flex xl:hidden">
            {!community ? null : communityDataIsLoading || subsIsLoading ? (
              <SimpleDescriptionSkeleton />
            ) : communityData && subsData ? (
              <CommunitySimpleDescription
                data={communityData}
                subs={subsData}
                username={community}
                notificationData={notificationData}
              />
            ) : null}
          </div>

          <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">{children}</div>
        </div>
        <div data-testid="card-explore-hive-desktop" className="hidden xl:col-span-2 xl:flex">
          {!community && !user.username ? (
            <ExploreHive />
          ) : !community && (!communityData || !communityData) ? (
            <CommunitiesSidebar />
          ) : !!community && (communityDataIsLoading || subsIsLoading) ? (
            <DescriptionSkeleton />
          ) : communityData && subsData ? (
            <CommunityDescription
              data={communityData}
              subs={subsData}
              notificationData={notificationData}
              username={community}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};
export default CommunityLayout;
