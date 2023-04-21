import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { getSubscriptions } from '@/lib/bridge';
import ProfileLayout from '@/components/common/profile-layout';
import SocialActivities from '@/components/social-activities';
import SubscriptionList from '@/components/subscription-list';
import Loading from '@/components/loading';
import { useSiteParams } from '@/components/hooks/use-site-params';

const UserCommunities = ({ hivebuzz, peakd }: { hivebuzz: any; peakd: any }) => {
  const { username } = useSiteParams();
  const {
    isLoading: dataSubscriptionsIsLoading,
    error: dataSubscriptionsError,
    data: dataSubscriptions
  } = useQuery(['listAllSubscription', username], () => getSubscriptions(username), { enabled: !!username });

  if (dataSubscriptionsIsLoading) return <Loading loading={dataSubscriptionsIsLoading} />;

  return (
    <ProfileLayout>
      <div className="flex flex-col">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Community Subscriptions</h2>
        <p>The author has subscribed to the following Hive Communities</p>

        <SubscriptionList data={dataSubscriptions} />

        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Badges and achievements</h2>
        <p>
          These are badges received by the author via the third-party apps{' '}
          <Link href="https://peakd.com/" className="text-red-600 hover:underline">
            Peakd
          </Link>{' '}
          &{' '}
          <Link href="https://hivebuzz.me/" className="text-red-600 hover:underline">
            Hivebuzz
          </Link>
          .
        </p>

        <SocialActivities data={hivebuzz} peakd={peakd} />
      </div>
    </ProfileLayout>
  );
};

export default UserCommunities;

//
export async function getServerSideProps(context: any) {
  const username = String(context.params?.param).slice(1);

  const hivebuzzRes = await fetch(`https://hivebuzz.me/api/badges/${username}`);
  const hivebuzzJson = await hivebuzzRes.json();
  const hivebuzzJsonStateOn = hivebuzzJson.filter((badge: any) => badge.state === 'on');

  const peakdRes = await fetch(`https://peakd.com/api/public/badge/${username}`);
  const peakdJson = await peakdRes.json();
  const peakdJsonMapedWithURL = peakdJson?.map((obj: any) => ({
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
}
