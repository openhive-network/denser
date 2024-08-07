import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { type Badge, getSubscriptions } from '@transaction/lib/bridge';
import ProfileLayout from '@/blog/components/common/profile-layout';
import SocialActivities from '@/blog/components/social-activities';
import SubscriptionList from '@/blog/components/subscription-list';
import Loading from '@ui/components/loading';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { validateHiveAccountName } from '@smart-signer/lib/validators/validate-hive-account-name';
import { getLogger } from '@ui/lib/logging';
import Error from 'next/error';
import { getTranslations } from '../../lib/get-translations';

const logger = getLogger('app');

const UserCommunities = ({
  hivebuzz,
  peakd,
  errorCode = 0
}: {
  hivebuzz: Badge[];
  peakd: Badge[];
  errorCode: number;
}) => {
  const { username } = useSiteParams();
  const { t } = useTranslation('common_blog');
  const { isLoading, error, data } = useQuery(
    ['listAllSubscription', username],
    () => getSubscriptions(username),
    { enabled: errorCode === 0 && !!username }
  );

  if (errorCode) return <Error statusCode={errorCode} />;

  if (isLoading) return <Loading loading={isLoading} />;

  return (
    <ProfileLayout>
      <div className="flex flex-col py-8">
        <h2 className="text-xl font-semibold" data-testid="community-subscriptions-label">
          {t('user_profile.social_tab.community_subscriptions_title')}
        </h2>
        <p data-testid="community-subscriptions-description">
          {t('user_profile.social_tab.the_author_has_subscribed_to_the_following')}
        </p>
        {data && data.length > 0 ? (
          <SubscriptionList data={data} />
        ) : (
          <div
            key="empty"
            className="bg-card-noContent border-card-empty-border my-12 border-2 border-solid  px-4 py-6 text-sm"
            data-testid="user-does-not-have-any-subscriptions-yet"
          >
            {t('user_profile.social_tab.you_dont_have_any_subscriptions')}
          </div>
        )}
        <h2 className="text-xl font-semibold" data-testid="badges-achievements-label">
          {t('user_profile.social_tab.badges_and_achievements_title')}
        </h2>
        <p data-testid="badges-achievements-description">
          {t('user_profile.social_tab.these_are_badges_received_by_the_author')}
          <Link href="https://peakd.com/" className="text-destructive hover:underline" target="_blank">
            Peakd
          </Link>
          {` & `}
          <Link href="https://hivebuzz.me/" className="text-destructive hover:underline" target="_blank">
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
  let hivebuzzJsonStateOn = [];
  let peakdJsonMapedWithURL = [];
  let errorCode = 0;

  try {
    const username = String(context.params?.param).slice(1);

    const validationResult = validateHiveAccountName(username);
    logger.info('validationResult: %s', validationResult);
    if (validationResult !== null) {
      errorCode = 404;
      throw new Error({ statusCode: 404 });
    }

    const hivebuzzRes = await fetch(`https://hivebuzz.me/api/badges/${username}`);
    if (hivebuzzRes.ok) {
      const hivebuzzJson = await hivebuzzRes.json();
      hivebuzzJsonStateOn = hivebuzzJson.filter((badge: Badge) => badge.state === 'on');
    }

    const peakdRes = await fetch(`https://peakd.com/api/public/badge/${username}`);
    if (peakdRes.ok) {
      const peakdJson = await peakdRes.json();
      peakdJsonMapedWithURL = peakdJson?.map((obj: Badge) => ({
        id: obj.title,
        url: `https://images.hive.blog/u/${obj.name}/avatar`,
        title: obj.title
      }));
    }
  } catch (error) {
    logger.error('Error in getServerSideProps: %o', error);
  }

  return {
    props: {
      errorCode,
      hivebuzz: hivebuzzJsonStateOn,
      peakd: peakdJsonMapedWithURL,
      ...(await getTranslations(context))
    }
  };
};
