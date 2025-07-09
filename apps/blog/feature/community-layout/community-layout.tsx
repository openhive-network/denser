import Link from 'next/link';
import { ReactNode } from 'react';
import CommunitySimpleDescription from './community-simple-description';
import CommunitiesMybar from '../../components/communities-mybar';
import CommunitiesSidebar from '../../components/communities-sidebar';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
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

const CommunityLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { user } = useUser();
  const tag = router.query.param as string;

  const { data: mySubsData } = useQuery(
    ['subscriptions', user?.username],
    () => getSubscriptions(user.username),
    {
      enabled: Boolean(user?.username)
    }
  );

  const { data: communityData, isLoading: communityDataIsLoading } = useQuery(
    ['community', tag, ''],
    () => getCommunity(tag, user.username),
    { enabled: !!tag }
  );

  const { data: subsData, isLoading: subsIsLoading } = useQuery(
    ['subscribers', tag],
    () => getSubscribers(tag),
    { enabled: !!tag }
  );

  const { data: notificationData } = useQuery(
    ['AccountNotification', tag],
    () => getAccountNotifications(tag),
    { enabled: !!tag }
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
            {communityDataIsLoading || subsIsLoading ? (
              <SimpleDescriptionSkeleton />
            ) : communityData && subsData ? (
              <CommunitySimpleDescription
                data={communityData}
                subs={subsData}
                username={tag || ' '}
                notificationData={notificationData}
              />
            ) : null}
          </div>
          <div>
            <div className="mx-2 text-lg xl:mt-4">
              <Link className="text-destructive" href={`/trending/${communityData?.name}`}>
                {communityData?.title}
              </Link>
            </div>
            <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">{children}</div>
          </div>
        </div>
        <div data-testid="card-explore-hive-desktop" className="hidden xl:col-span-2 xl:flex">
          {communityDataIsLoading || subsIsLoading ? (
            <DescriptionSkeleton />
          ) : (
            communityData &&
            subsData && (
              <CommunityDescription
                data={communityData}
                subs={subsData}
                notificationData={notificationData}
                username={tag}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};
export default CommunityLayout;
