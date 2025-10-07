import { ReactNode } from 'react';
import CommunitySimpleDescription from './community-simple-description';
import CommunitiesMybar from '../../components/communities-mybar';
import CommunitiesSidebar from '../../components/communities-sidebar';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getAccountNotifications, getSubscribers } from '@transaction/lib/bridge';
import CommunityDescription from './community-description';
import SimpleDescriptionSkeleton from '@/blog/features/community-layout/simple-description-skeleton';
import DescriptionSkeleton from './descripton-skeleton';
import ExploreHive from '@/blog/components/explore-hive';
import { Community } from '@transaction/lib/extended-hive.chain';

const CommunityLayout = ({
  children,
  community,
  mySubsData,
  communityData
}: {
  children: ReactNode;
  community?: string;
  mySubsData?: string[][] | null;
  communityData?: Community | null;
}) => {
  const { user } = useUser();
  const communityPage = community?.startsWith('hive-') ?? false;

  const { data: subsData, isLoading: subsIsLoading } = useQuery(
    ['subscribers', community],
    () => getSubscribers(community ?? ''),
    { enabled: !!community }
  );
  const { data: notificationData } = useQuery(
    ['AccountNotification', community],
    () => getAccountNotifications(community ?? ''),
    { enabled: !!community }
  );
  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          {!!mySubsData ? <CommunitiesMybar username={user.username} /> : <CommunitiesSidebar />}
        </div>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
          <div data-testid="card-explore-hive-mobile" className="md:col-span-10 md:flex xl:hidden">
            {!community || !communityPage ? null : subsIsLoading ? (
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
          {!community && !mySubsData ? (
            <ExploreHive />
          ) : !community && !communityData ? (
            <CommunitiesSidebar />
          ) : !communityPage ? null : !!community && subsIsLoading ? (
            <DescriptionSkeleton />
          ) : communityData && subsData ? (
            <CommunityDescription
              data={communityData}
              subs={subsData}
              notificationData={notificationData}
              username={community ?? ''}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};
export default CommunityLayout;
