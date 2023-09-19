import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Badge, getSubscriptions } from '@/blog/lib/bridge';
import ProfileLayout from '@/blog/components/common/profile-layout';
import SocialActivities from '@/blog/components/social-activities';
import SubscriptionList from '@/blog/components/subscription-list';
import Loading from '@hive/ui/components/loading';
import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import { GetServerSideProps } from 'next';

const UserCommunities = ({ hivebuzz, peakd }: { hivebuzz: Badge[]; peakd: Badge[] }) => {
  const { username } = useSiteParams();
  const {
    isLoading: dataSubscriptionsIsLoading,
    error: dataSubscriptionsError,
    data: dataSubscriptions
  } = useQuery(['listAllSubscription', username], () => getSubscriptions(username), { enabled: !!username });
  if (dataSubscriptionsIsLoading) return <Loading loading={dataSubscriptionsIsLoading} />;

  return (
    <ProfileLayout>
      <div className="flex flex-col py-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white" data-testid="community-subscriptions-label">Community Subscriptions</h2>
        <p data-testid="community-subscriptions-description">The author has subscribed to the following Hive Communities</p>
        <SubscriptionList data={dataSubscriptions} />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white" data-testid="badges-achievements-label">Badges and achievements</h2>
        <p data-testid="badges-achievements-description">
          These are badges received by the author via the third-party apps{' '}
          <Link href="https://peakd.com/" className="text-red-600 hover:underline" target='_blank'>
            Peakd
          </Link>{' '}
          &{' '}
          <Link href="https://hivebuzz.me/" className="text-red-600 hover:underline" target='_blank'>
            Hivebuzz
          </Link>
          .
        </p>

        <SocialActivities data={hivebuzz} peakd={peakd} username={username}/>
      </div>
    </ProfileLayout>
  );
};

export default UserCommunities;

//
export const getServerSideProps: GetServerSideProps = async (context) => {
  const username = String(context.params?.param).slice(1);

  const hivebuzzRes = await fetch(`https://hivebuzz.me/api/badges/${username}`);
  const hivebuzzJson = await hivebuzzRes.json();
  const hivebuzzJsonStateOn = hivebuzzJson.filter((badge: Badge) => badge.state === 'on');

  const peakdRes = await fetch(`https://peakd.com/api/public/badge/${username}`);
  const peakdJson = await peakdRes.json();
  const peakdJsonMapedWithURL = peakdJson?.map((obj: Badge) => ({
    id: obj.title,
    url: `https://images.hive.blog/u/${obj.name}/avatar`,
    title: obj.title
  }));
  return {
    props: {
      hivebuzz: hivebuzzJsonStateOn,
      peakd: peakdJsonMapedWithURL
    }
  };
};
