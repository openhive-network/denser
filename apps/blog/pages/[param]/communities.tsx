import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Badge, getSubscriptions } from '@/blog/lib/bridge';
import ProfileLayout from '@/blog/components/common/profile-layout';
import SocialActivities from '@/blog/components/social-activities';
import SubscriptionList from '@/blog/components/subscription-list';
import Loading from '@hive/ui/components/loading';
import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';

const UserCommunities = ({
                           hivebuzz,
                           peakd
                         }: {
  hivebuzz: Badge[];
  peakd: Badge[];
}) => {
  const { username } = useSiteParams();
  const { t } = useTranslation('common_blog');
  const {
    isLoading,
    error,
    data
  } = useQuery(
    ['listAllSubscription', username],
    () => getSubscriptions(username),
    { enabled: !!username }
  );
  if (isLoading)
    return <Loading loading={isLoading} />;
  return (
    <ProfileLayout>
      <div className='flex flex-col py-8'>
        <h2
          className='text-xl font-semibold text-slate-900 dark:text-white'
          data-testid='community-subscriptions-label'
        >
          {t('user_profil.social_tab.community_subscriptions_title')}
        </h2>
        <p data-testid='community-subscriptions-description'>
          {t('user_profil.social_tab.the_author_has_subscribed_to_the_following')}
        </p>
        {data && data.length > 0 ? (
          <SubscriptionList data={data} />
        ) : (
          <div
            key='empty'
            className='px-4 py-6 my-12 bg-green-100 dark:bg-slate-700 text-sm'
          >
            Welcome! You don&apos;t have any subscriptions yet.
          </div>
        )}
        <h2
          className='text-xl font-semibold text-slate-900 dark:text-white'
          data-testid='badges-achievements-label'
        >
          {t('user_profil.social_tab.badges_and_achievements_title')}
        </h2>
        <p data-testid='badges-achievements-description'>
          {t('user_profil.social_tab.these_are_badges_received_by_the_author')}
          <Link
            href='https://peakd.com/'
            className='text-red-600 hover:underline'
            target='_blank'
          >
            Peakd
          </Link>
          {` & `}
          <Link
            href='https://hivebuzz.me/'
            className='text-red-600 hover:underline'
            target='_blank'
          >
            Hivebuzz
          </Link>
          .
        </p>

        <SocialActivities data={hivebuzz} peakd={peakd} username={username} />
      </div>
    </ProfileLayout>
  );
};

export default UserCommunities;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const username = String(context.params?.param).slice(1);

  const hivebuzzRes = await fetch(`https://hivebuzz.me/api/badges/${username}`);
  const hivebuzzJson = await hivebuzzRes.json();
  const hivebuzzJsonStateOn = hivebuzzJson.filter(
    (badge: Badge) => badge.state === 'on'
  );

  const peakdRes = await fetch(
    `https://peakd.com/api/public/badge/${username}`
  );
  const peakdJson = await peakdRes.json();
  const peakdJsonMapedWithURL = peakdJson?.map((obj: Badge) => ({
    id: obj.title,
    url: `https://images.hive.blog/u/${obj.name}/avatar`,
    title: obj.title
  }));
  return {
    props: {
      hivebuzz: hivebuzzJsonStateOn,
      peakd: peakdJsonMapedWithURL,
      ...(await serverSideTranslations(context.req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_blog']))
    }
  };
};
